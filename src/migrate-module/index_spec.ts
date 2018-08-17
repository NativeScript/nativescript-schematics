import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { Schema as MigrateModuleOptions } from './schema';
import { Schema as ApplicationOptions } from '../ng-new/shared/schema';
import { Schema as ComponentOptions } from '../generate/component/schema';
import { Schema as ModuleOptions } from '../generate/module/schema';
import { move, HostTree, source } from '@angular-devkit/schematics';
import { callRuleSync, getSourceFile } from '../utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { isInModuleMetadata } from '../test-utils';
import { InsertChange } from '@schematics/angular/utility/change';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

describe('Migrate module Schematic', () => {
  const project = 'some-project';
  const moduleName = 'admin';
  const defaultOptions: MigrateModuleOptions = {
    name: moduleName,
    project,
  };
  const nsModulePath = '/src/app/admin/admin.module.tns.ts';
  const webModulePath = '/src/app/admin/admin.module.ts';
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );

  let appTree: UnitTestTree;
  beforeEach(() => {
    appTree = new UnitTestTree(new HostTree);
    appTree = setupProject(appTree, schematicRunner, project, moduleName);
  });

  describe('When the name of existing module is provided', () => {
    beforeEach(() => {
      const options = { ...defaultOptions };
      appTree = schematicRunner.runSchematic('migrate-module', options, appTree);
    });

    it('should create a mobile module file', () => {
      expect(appTree.files.includes('/src/app/admin/admin.module.tns.ts')).toBeTruthy();
    });

    it('should create a common file', () => {
      expect(appTree.files.includes('/src/app/admin/admin.common.ts')).toBeTruthy();
    });
  });

  describe('When a custom mobile extension is provided', () => {
    beforeEach(() => {
      const options: MigrateModuleOptions = { ...defaultOptions, nsext: 'mobile' };
      appTree = schematicRunner.runSchematic('migrate-module', options, appTree);
    });

    it('should create the module file with that extension', () => {
      expect(appTree.files.includes('/src/app/admin/admin.module.mobile.ts')).toBeTruthy();
    });

    it('should create a common file without the extension', () => {
      expect(appTree.files.includes('/src/app/admin/admin.common.ts')).toBeTruthy();
    });
  });

  describe('When the module has a component', () => {
    let originalWebModuleContent: string;
    beforeEach(() => {
      appTree = schematicRunner.runSchematic('component', <ComponentOptions>{
        name: 'a',
        module: moduleName,
        project,
        nativescript: false,
      }, appTree);
      
      originalWebModuleContent = getFileContent(appTree, webModulePath);

      const options: MigrateModuleOptions = { ...defaultOptions };
      appTree = schematicRunner.runSchematic('migrate-module', options, appTree);
    });

    it('should keep the web module untouched', () => {
      expect(appTree.files.includes(webModulePath)).toBeTruthy();
      expect(getFileContent(appTree, webModulePath)).toEqual(originalWebModuleContent)
    });

    it('should declare the component in the mobile module', () => {
      expect(appTree.files.includes(nsModulePath)).toBeTruthy();
      const content = getFileContent(appTree, nsModulePath);

      const matcher = isInModuleMetadata('AdminModule', 'declarations', 'AComponent', true);
      expect(content).toMatch(matcher);
    });
  });

  describe('When the module has a provider', () => {
    const provider = 'SomeProvider';
    let originalWebModuleContent: string;
    beforeEach(() => {
      appTree = insertProviderInMetadata(appTree, webModulePath, provider);
      originalWebModuleContent = getFileContent(appTree, webModulePath);
      const options: MigrateModuleOptions = { ...defaultOptions };
      appTree = schematicRunner.runSchematic('migrate-module', options, appTree);
    });

    it('should keep the web module untouched', () => {
      expect(appTree.files.includes(webModulePath)).toBeTruthy();
      expect(getFileContent(appTree, webModulePath)).toEqual(originalWebModuleContent)
    });

    it('should provide the service in the mobile module', () => {
      expect(appTree.files.includes(nsModulePath)).toBeTruthy();
      const content = getFileContent(appTree, nsModulePath);

      const matcher = isInModuleMetadata('AdminModule', 'providers', provider, true);
      expect(content).toMatch(matcher);
    });
  });
});

const setupProject = (appTree, schematicRunner, project, moduleName) => {
  appTree = schematicRunner.runSchematic('shared', <ApplicationOptions>{
    name: project,
    prefix: '',
    sourceDir: 'src',
    style: 'css',
    theme: true,
    sample: false,
  }, appTree);

  // Move the application from 'project' to the root,
  // so we can call schematics that depend on being executed inside a project
  appTree = callRuleSync(schematicRunner, () => move(project, '.'), appTree) as UnitTestTree;
  appTree = schematicRunner.runSchematic('module', <ModuleOptions>{
    name: moduleName,
    nativescript: false,
    web: true,
    project,
  }, appTree);

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
