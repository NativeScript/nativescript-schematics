import { join } from 'path';

import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';

import { Schema as ModuleOptions } from './schema';
import { DEFAULT_EXTENSIONS, createEmptyProject, toNgModuleClassName } from '../utils';
import { isInModuleMetadata } from '../test-utils';

describe('Module Schematic', () => {
  const path = 'app';
  const sourceDir = 'app';
  const name = 'foo';
  const moduleClassName = toNgModuleClassName(name);
  const defaultOptions: ModuleOptions = {
    name,
    path,
    sourceDir,
    web: false,
    nativescript: true,
  };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );
  const nsModulePath = `/${sourceDir}/${path}/${name}/${name}.module${DEFAULT_EXTENSIONS.ns}.ts`;
  const nsRoutingModulePath = `/${sourceDir}/${path}/${name}/${name}-routing.module${DEFAULT_EXTENSIONS.ns}.ts`;

  const webModulePath = `/${sourceDir}/${path}/${name}/${name}.module${DEFAULT_EXTENSIONS.web}.ts`;
  let appTree: Tree;
  
  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree);
    appTree = createEmptyProject(appTree);
  });
 
  describe('when in ns-only project', () => {
    describe('with default options', () => {
      let tree;
      beforeEach(() => {
        const options = { ...defaultOptions };
        tree = schematicRunner.runSchematic('module', options, appTree);
      });

      it('should create tns module file', () => {
        expect(tree.exists(nsModulePath)).toBeTruthy();
        expect(getFileContent(tree, nsModulePath)).toContain('NativeScriptCommonModule');
        expect(getFileContent(tree, nsModulePath)).toContain(`class ${moduleClassName}`);
      });

      it('should not create web module file', () => {
        expect(tree.exists(webModulePath)).toBeFalsy();
      });

      it('should not have CommonModule imported', () => {
        const content = getFileContent(tree, nsModulePath);
        expect(content).not.toMatch(`import { CommonModule } from '@angular/common'`);

        expect(content).not.toMatch(isInModuleMetadata(moduleClassName, 'imports', 'CommonModule', true));
      });

      it('should have NativeScriptCommonModule imported', () => {
        const content = getFileContent(tree, nsModulePath);
        expect(content).toMatch(`import { NativeScriptCommonModule } from 'nativescript-angular/common'`);
      });

      it('should have NO_ERRORS_SCHEMA imported', () => {
        const content = getFileContent(tree, nsModulePath);
        expect(content).toMatch(/import { [^}]*NO_ERRORS_SCHEMA(.*)} from '@angular\/core';/);
      });

      it('should have NO_ERRORS_SCHEMA declared', () => {
        const content = getFileContent(tree, nsModulePath);
        expect(content).toMatch(
          isInModuleMetadata(moduleClassName, 'schemas', 'NO_ERRORS_SCHEMA', true));
      });
    });

    it('should not have NativeScriptCommonModule imported if that is specified explicitly', () => {
      const options = { ...defaultOptions, commonModule: false };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const content = getFileContent(tree, nsModulePath);
      expect(content).not.toMatch(`import { NativeScriptCommonModule } from 'nativescript-angular/common'`);
    });

    it('should not have RouterModule imported in the routing module', () => {
      const options = { ...defaultOptions, routing: true };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const content = getFileContent(tree, nsRoutingModulePath);
      expect(content).not.toMatch(`import { RouterModule } from '@angular/router'`);

      expect(content).not.toMatch(new RegExp(
        '@NgModule\\(\\{\\s*' +
        'imports: \\[(\\s*|(\\s*\\.*),(\\s*))' +
        'RouterModule.forChild\\('
      ));

      expect(content).not.toMatch(new RegExp(
        '@NgModule\\(\\{\\s*' +
        'exports: \\[(\\s*|(\\s*\\.*),(\\s*))' +
        'RouterModule'
      ));
    });

    it('should have NativeScriptRouterModule imported', () => {
      const options = { ...defaultOptions, routing: true };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const content = getFileContent(tree, nsRoutingModulePath);
      expect(content).toMatch(`import { NativeScriptRouterModule } from 'nativescript-angular/router'`);
    });
  });

  describe('when in web-only project', () => {
    let tree;
    beforeEach(() => {
      const options = { ...defaultOptions, nativescript: false, web: true };
      tree = schematicRunner.runSchematic('module', options, appTree);
    });

    it('should create web module file', () => {
      expect(tree.files.indexOf(webModulePath)).toBeGreaterThanOrEqual(0);
      expect(getFileContent(tree, webModulePath)).toContain('CommonModule');
      expect(getFileContent(tree, webModulePath)).toContain(`class ${moduleClassName}`);
    });

    it('should not create ns module file', () => {
      expect(tree.exists(nsModulePath)).toBeFalsy();
    });
  });

  describe('when in ns+web project', () => {
    let tree;
    beforeEach(() => {
      const options = { ...defaultOptions, nativescript: true, web: true };
      tree = schematicRunner.runSchematic('module', options, appTree);
    });

    it('should generate both web and ns module files', () => {
      expect(tree.exists(nsModulePath)).toBeTruthy();
      expect(tree.exists(webModulePath)).toBeTruthy();
    });
  })
});
