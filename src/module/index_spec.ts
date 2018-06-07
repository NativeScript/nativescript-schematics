import { join } from 'path';

import { VirtualTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';

import { Schema as ModuleOptions } from './schema';
import { createEmptyProject, toNgModuleClassName } from '../utils';
import { DEFAULT_SHARED_EXTENSIONS } from '../generate/utils';
import { isInModuleMetadata } from '../test-utils';

describe('Module Schematic', () => {
  const path = 'app';
  const sourceDir = 'app';
  const name = 'foo';
  const moduleClassName = toNgModuleClassName(name);
  const defaultOptions: ModuleOptions = {
    name,
    path,
    web: false,
    nativescript: true,
  };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );
  const getModulePath = (extension: string) => `/${sourceDir}/${path}/${name}/${name}.module${extension}.ts`;
  const noExtensionModulePath = getModulePath('');
  const nsModulePath = getModulePath(DEFAULT_SHARED_EXTENSIONS.ns);
  const webModulePath = getModulePath(DEFAULT_SHARED_EXTENSIONS.web);

  const getRoutingModulePath = (extension: string) => `/${sourceDir}/${path}/${name}/${name}-routing.module${extension}.ts`;
  const noExtensionRoutingModulePath = getRoutingModulePath('');
  const nsRoutingModulePath = getRoutingModulePath(DEFAULT_SHARED_EXTENSIONS.ns);
  const webRoutingModulePath = getRoutingModulePath(DEFAULT_SHARED_EXTENSIONS.web);

  let appTree;
  
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

      it('should create tns module file with no extension', () => {
        expect(tree.exists(noExtensionModulePath)).toBeTruthy();
        expect(getFileContent(tree, noExtensionModulePath)).toContain('NativeScriptCommonModule');
        expect(getFileContent(tree, noExtensionModulePath)).toContain(`class ${moduleClassName}`);
      });

      it('should respect passed extension', () => {
        const customExtension = '.mobile';
        const options = { ...defaultOptions, routing: true, nsExtension: customExtension };
        tree = schematicRunner.runSchematic('module', options, appTree);

        const modulePath = getModulePath(customExtension);
        expect(tree.exists(modulePath)).toBeTruthy();

        const routingModulePath = getRoutingModulePath(customExtension);
        expect(tree.exists(routingModulePath)).toBeTruthy();
      });

      it('should not create files with .tns extension', () => {
        expect(tree.exists(nsModulePath)).toBeFalsy();
      });

      it('should not have CommonModule imported', () => {
        const content = getFileContent(tree, noExtensionModulePath);
        expect(content).not.toMatch(`import { CommonModule } from '@angular/common'`);

        expect(content).not.toMatch(isInModuleMetadata(moduleClassName, 'imports', 'CommonModule', true));
      });

      it('should have NativeScriptCommonModule imported', () => {
        const content = getFileContent(tree, noExtensionModulePath);
        expect(content).toMatch(`import { NativeScriptCommonModule } from 'nativescript-angular/common'`);
      });

      it('should have NO_ERRORS_SCHEMA imported', () => {
        const content = getFileContent(tree, noExtensionModulePath);
        expect(content).toMatch(/import { [^}]*NO_ERRORS_SCHEMA(.*)} from '@angular\/core';/);
      });

      it('should have NO_ERRORS_SCHEMA declared', () => {
        const content = getFileContent(tree, noExtensionModulePath);
        expect(content).toMatch(
          isInModuleMetadata(moduleClassName, 'schemas', 'NO_ERRORS_SCHEMA', true));
      });
    });

    it('should not have NativeScriptCommonModule imported if that is specified explicitly', () => {
      const options = { ...defaultOptions, commonModule: false };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const content = getFileContent(tree, noExtensionModulePath);
      expect(content).not.toMatch(`import { NativeScriptCommonModule } from 'nativescript-angular/common'`);
    });

    it('should not have RouterModule imported in the routing module', () => {
      const options = { ...defaultOptions, routing: true };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const content = getFileContent(tree, noExtensionModulePath);
      expect(content).not.toMatch(`import { RouterModule } from '@angular/router'`);

      expect(content).not.toMatch(
        isInModuleMetadata(moduleClassName, 'exports', 'RouterModule.forChild', true));

      expect(content).not.toMatch(
        isInModuleMetadata(moduleClassName, 'exports', 'RouterModule', true));
    });

    it('should have NativeScriptRouterModule imported', () => {
      const options = { ...defaultOptions, routing: true };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const content = getFileContent(tree, noExtensionRoutingModulePath);
      expect(content).toMatch(`import { NativeScriptRouterModule } from 'nativescript-angular/router'`);
    });
  });

  describe('when in web-only project', () => {
    const webOnlyOptions = { ...defaultOptions, nativescript: false, web: true };

    it('should create web module file', () => {
      const options = { ...webOnlyOptions };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      expect(tree.files.indexOf(webModulePath)).toBeGreaterThanOrEqual(0);
      expect(getFileContent(tree, webModulePath)).toContain('CommonModule');
      expect(getFileContent(tree, webModulePath)).toContain(`class ${moduleClassName}`);
    });

    it('should not create ns module file', () => {
      const options = { ...webOnlyOptions };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      expect(tree.exists(nsModulePath)).toBeFalsy();
    });

    it('should respect passed extension', () => {
      const customExtension = '.web';
      const options = { ...webOnlyOptions, webExtension: customExtension, routing: true };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const modulePath = getModulePath(customExtension);
      expect(tree.exists(modulePath)).toBeTruthy();

      const routingModulePath = getRoutingModulePath(customExtension);
      expect(tree.exists(routingModulePath)).toBeTruthy();
    });
  });

  describe('when in ns+web project', () => {
    const nsWebOptions = {
      ...defaultOptions,
      nativescript: true,
      web: true,
    };

    it('should generate both web and ns module files', () => {
      const options = { ...nsWebOptions };
      const tree = schematicRunner.runSchematic('module', options, appTree);
      expect(tree.exists(nsModulePath)).toBeTruthy();
      expect(tree.exists(webModulePath)).toBeTruthy();
    });

    it('should create both routing modules when routing flag is passed', () => {
      const options = { ...nsWebOptions, routing: true };
      const tree = schematicRunner.runSchematic('module', options, appTree);
      expect(tree.exists(nsRoutingModulePath)).toBeTruthy();
      expect(tree.exists(webRoutingModulePath)).toBeTruthy();
    });

    it('should respect passed extension', () => {
      const nsExtension = '.mobile';
      const webExtension = '.web';
      const options = { ...nsWebOptions, nsExtension, webExtension, routing: true };
      const tree = schematicRunner.runSchematic('module', options, appTree);

      const webModulePath = getModulePath(webExtension);
      const nsModulePath = getModulePath(nsExtension);
      expect(tree.exists(webModulePath)).toBeTruthy();
      expect(tree.exists(nsModulePath)).toBeTruthy();

      const webRoutingModulePath = getRoutingModulePath(webExtension);
      const nsRoutingModulePath = getRoutingModulePath(nsExtension);
      expect(tree.exists(webRoutingModulePath)).toBeTruthy();
      expect(tree.exists(nsRoutingModulePath)).toBeTruthy();
    });
  });
});
