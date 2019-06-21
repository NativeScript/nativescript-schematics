import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { HostTree } from '@angular-devkit/schematics';
import { getFileContent } from '@schematics/angular/utility/test';
import { InsertChange } from '@schematics/angular/utility/change';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

import { Schema as MigrateModuleOptions } from './schema';
import { Schema as ApplicationOptions } from '../ng-new/shared/schema';
import { Schema as ComponentOptions } from '../generate/component/schema';
import { Schema as ModuleOptions } from '../generate/module/schema';
import { getSourceFile, moveToRoot } from '../utils';
import { isInModuleMetadata } from '../test-utils';
import { findImports } from '../ast-utils';

describe('Migrate module Schematic', () => {
  const project = 'some-project';
  const moduleName = 'admin';
  const defaultOptions: MigrateModuleOptions = {
    name: moduleName,
    project,
    style: true
  };
  const nsModulePath = '/src/app/admin/admin.module.tns.ts';
  const webModulePath = '/src/app/admin/admin.module.ts';
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );

  let appTree: UnitTestTree;
  beforeEach(async () => {
    appTree = new UnitTestTree(new HostTree);
    appTree = await setupProject(appTree, schematicRunner, project, moduleName);
  });

  describe('When the name of existing module is provided', () => {
    beforeEach(async () => {
      const options = { ...defaultOptions };
      appTree = await schematicRunner.runSchematicAsync('migrate-module', options, appTree)
        .toPromise();
    });

    it('should create a mobile module file', () => {
      expect(appTree.files).toContain('/src/app/admin/admin.module.tns.ts');
    });

    it('should create a common file', () => {
      expect(appTree.files).toContain('/src/app/admin/admin.common.ts');
    });
  });

  describe('When a custom mobile extension is provided', () => {
    beforeEach(async () => {
      const options: MigrateModuleOptions = { ...defaultOptions, nsext: 'mobile' };
      appTree = await schematicRunner.runSchematicAsync('migrate-module', options, appTree)
        .toPromise();
    });

    it('should create the module file with that extension', () => {
      expect(appTree.files).toContain('/src/app/admin/admin.module.mobile.ts');
    });

    it('should create a common file without the extension', () => {
      expect(appTree.files).toContain('/src/app/admin/admin.common.ts');
    });
  });

  describe('When the module has a component', () => {
    let originalWebModuleContent: string;
    beforeEach(async () => {
      appTree = await schematicRunner.runSchematicAsync('component', <ComponentOptions>{
        name: 'a',
        module: moduleName,
        project,
        nativescript: false,
      }, appTree)
      .toPromise();

      originalWebModuleContent = getFileContent(appTree, webModulePath);

      const options: MigrateModuleOptions = { ...defaultOptions };
      appTree = await schematicRunner.runSchematicAsync('migrate-module', options, appTree)
        .toPromise();
    });

    it('should keep the web module untouched', () => {
      expect(appTree.files).toContain(webModulePath);
      expect(getFileContent(appTree, webModulePath)).toEqual(originalWebModuleContent)
    });

    it('should declare the component in the mobile module', () => {
      expect(appTree.files).toContain(nsModulePath);
      const content = getFileContent(appTree, nsModulePath);

      const matcher = isInModuleMetadata('AdminModule', 'declarations', 'AComponent', true);
      expect(content).toMatch(matcher);
    });

    it('should import the component in the mobile module using @src', () => {
      const source = getSourceFile(appTree, nsModulePath);
      const imports = findImports('AComponent', source);

      expect(imports.length).toEqual(1);
      expect(imports[0].getFullText()).toContain(`@src/app/a/a.component`)
    });
  });

  describe('When the module has a provider', () => {
    const provider = 'SomeProvider';
    let originalWebModuleContent: string;
    beforeEach(async () => {
      appTree = insertProviderInMetadata(appTree, webModulePath, provider);
      originalWebModuleContent = getFileContent(appTree, webModulePath);
      const options: MigrateModuleOptions = { ...defaultOptions };
      appTree = await schematicRunner.runSchematicAsync('migrate-module', options, appTree)
        .toPromise();
    });

    it('should keep the web module untouched', () => {
      expect(appTree.files).toContain(webModulePath);
      expect(getFileContent(appTree, webModulePath)).toEqual(originalWebModuleContent)
    });

    it('should provide the service in the mobile module', () => {
      expect(appTree.files).toContain(nsModulePath);
      const content = getFileContent(appTree, nsModulePath);

      const matcher = isInModuleMetadata('AdminModule', 'providers', provider, true);
      expect(content).toMatch(matcher);
    });
  });
});

const setupProject = async (
  appTree: UnitTestTree,
  schematicRunner: SchematicTestRunner,
  project: string,
  moduleName: string,
) => {
  appTree = await schematicRunner.runSchematicAsync('shared', <ApplicationOptions>{
    name: project,
    prefix: '',
    sourceDir: 'src',
    style: 'css',
    theme: true,
    sample: false,
  }, appTree)
  .toPromise();

  appTree = moveToRoot<UnitTestTree>(schematicRunner, appTree, project);
  appTree = await schematicRunner.runSchematicAsync('module', <ModuleOptions>{
    name: moduleName,
    nativescript: false,
    web: true,
    project,
  }, appTree)
  .toPromise();

  return appTree;
};

const insertProviderInMetadata = (tree, path, providerName): UnitTestTree => {
  const source = getSourceFile(tree, path);
  const recorder = tree.beginUpdate(path);

  // Insert a provider in the NgModule metadata
  const metadataChange = addSymbolToNgModuleMetadata(
    source, path, 'providers', providerName, 'somepath'
  )

  metadataChange.forEach((change: InsertChange) =>
    recorder.insertRight(change.pos, change.toAdd)
  );
  tree.commitUpdate(recorder);

  return tree;
};
