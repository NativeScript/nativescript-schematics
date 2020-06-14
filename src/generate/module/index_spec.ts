import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';

import { Schema as ModuleOptions } from './schema';
import { toNgModuleClassName } from '../../utils';
import {
  createEmptySharedProject,
  createEmptyNsOnlyProject,
  isInModuleMetadata,
} from '../../test-utils';
import { DEFAULT_SHARED_EXTENSIONS } from '../utils';

describe('Module Schematic', () => {
  const name = 'foo';
  const project = 'test';
  const moduleClassName = toNgModuleClassName(name);
  const defaultOptions: ModuleOptions = {
    project,
    name,
  };
  const schematicRunner = new SchematicTestRunner(
    '@nativescript/schematics',
    join(__dirname, '../../collection.json'),
  );
  const getModulePath = (extension: string) => `/src/app/${name}/${name}.module${extension}.ts`;
  const noExtensionModulePath = getModulePath('');
  const nsModulePath = getModulePath(DEFAULT_SHARED_EXTENSIONS.ns);
  const webModulePath = getModulePath(DEFAULT_SHARED_EXTENSIONS.web);
  const commonFilePath = `/src/app/${name}/${name}.common.ts`;

  const getRoutingModulePath = (extension: string) => `/src/app/${name}/${name}-routing.module${extension}.ts`;
  const noExtensionRoutingModulePath = getRoutingModulePath('');
  const nsRoutingModulePath = getRoutingModulePath(DEFAULT_SHARED_EXTENSIONS.ns);
  const webRoutingModulePath = getRoutingModulePath(DEFAULT_SHARED_EXTENSIONS.web);

  let appTree: UnitTestTree;

  describe('when in ns-only project', () => {
    beforeEach(() => {
      appTree = createEmptyNsOnlyProject(project);
    });

    let tree: UnitTestTree;
    describe('with default options', () => {
      beforeEach(async () => {
        tree = await schematicRunner.runSchematicAsync('module', defaultOptions, appTree).toPromise();
      });

      it('should create tns module file with no extension', () => {
        expect(tree.exists(noExtensionModulePath)).toBeTruthy();
        expect(getFileContent(tree, noExtensionModulePath)).toContain('NativeScriptCommonModule');
        expect(getFileContent(tree, noExtensionModulePath)).toContain(`class ${moduleClassName}`);
      });

      it('should not create files with .tns extension', () => {
        expect(tree.exists(nsModulePath)).toBeFalsy();
      });

      it('should not create a common file', () => {
        expect(tree.exists(commonFilePath)).toBeFalsy();
      });

      it('should not have CommonModule imported', () => {
        const content = getFileContent(tree, noExtensionModulePath);
        expect(content).not.toMatch(`import { CommonModule } from '@angular/common'`);
        expect(content).not.toMatch(isInModuleMetadata(moduleClassName, 'imports', 'CommonModule', true));
      });

      it('should have NativeScriptCommonModule imported', () => {
        const content = getFileContent(tree, noExtensionModulePath);
        expect(content).toMatch(`import { NativeScriptCommonModule } from '@nativescript/angular'`);
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

    it('should respect passed extension', async () => {
      const customExtension = '.mobile';
      const options = { ...defaultOptions, routing: true, nsExtension: customExtension };
      const testTree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

      const modulePath = getModulePath(customExtension);
      expect(testTree.exists(modulePath)).toBeTruthy();

      const routingModulePath = getRoutingModulePath(customExtension);
      expect(testTree.exists(routingModulePath)).toBeTruthy();
    });

    it('should not have NativeScriptCommonModule imported if that is specified explicitly', async () => {
      const options = { ...defaultOptions, commonModule: false };
      const testTree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

      const content = getFileContent(testTree, noExtensionModulePath);
      expect(content).not.toMatch(`import { NativeScriptCommonModule } from '@nativescript/angular'`);
    });

    it('should not have RouterModule imported in the routing module', async () => {
      const options = { ...defaultOptions, routing: true };
      const testTree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

      const content = getFileContent(testTree, noExtensionModulePath);
      expect(content).not.toMatch(`import { RouterModule } from '@angular/router'`);

      expect(content).not.toMatch(
        isInModuleMetadata(moduleClassName, 'exports', 'RouterModule.forChild', true));

      expect(content).not.toMatch(
        isInModuleMetadata(moduleClassName, 'exports', 'RouterModule', true));
    });

    it('should have NativeScriptRouterModule imported', async () => {
      const options = { ...defaultOptions, routing: true };
      const testTree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

      const content = getFileContent(testTree, noExtensionRoutingModulePath);
      expect(content).toMatch(`import { NativeScriptRouterModule } from '@nativescript/angular'`);
    });

  });

  describe('when in ns+web project', () => {
    beforeEach(() => {
      appTree = createEmptySharedProject(project);
    });

    describe('executing ns-only schematic', () => {
      const nsOnlyOptions = { ...defaultOptions, nativescript: true, web: false };

      it('should create ns module file', async () => {
        const options = { ...nsOnlyOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        expect(tree.files).toContain(nsModulePath);
        expect(getFileContent(tree, nsModulePath)).toContain('CommonModule');
        expect(getFileContent(tree, nsModulePath)).toContain(`class ${moduleClassName}`);
      });

      it('should not create web module file', async () => {
        const options = { ...nsOnlyOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        expect(tree.exists(webModulePath)).toBeFalsy();
      });

      it('should not create a common file', async () => {
        const options = { ...nsOnlyOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        expect(tree.exists(commonFilePath)).toBeFalsy();
      });

      it('should respect passed extension', async () => {
        const customExtension = '.mobile';
        const options = { ...nsOnlyOptions, nsExtension: customExtension, routing: true };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        const modulePath = getModulePath(customExtension);
        expect(tree.exists(modulePath)).toBeTruthy();

        const routingModulePath = getRoutingModulePath(customExtension);
        expect(tree.exists(routingModulePath)).toBeTruthy();
      });
    });

    describe('executing web-only schematic', () => {
      const webOnlyOptions = { ...defaultOptions, nativescript: false, web: true };

      it('should create web module file', async () => {
        const options = { ...webOnlyOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        expect(tree.files).toContain(webModulePath);
        expect(getFileContent(tree, webModulePath)).toContain('CommonModule');
        expect(getFileContent(tree, webModulePath)).toContain(`class ${moduleClassName}`);
      });

      it('should not create ns module file', async () => {
        const options = { ...webOnlyOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        expect(tree.exists(nsModulePath)).toBeFalsy();
      });

      it('should not create a common file', async () => {
        const options = { ...webOnlyOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        expect(tree.exists(commonFilePath)).toBeFalsy();
      });

      it('should respect passed extension', async () => {
        const customExtension = '.web';
        const options = { ...webOnlyOptions, webExtension: customExtension, routing: true };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        const modulePath = getModulePath(customExtension);
        expect(tree.exists(modulePath)).toBeTruthy();

        const routingModulePath = getRoutingModulePath(customExtension);
        expect(tree.exists(routingModulePath)).toBeTruthy();
      });
    });

    describe('executing web+ns schematic', () => {
      const nsWebOptions = {
        ...defaultOptions,
        nativescript: true,
        web: true,
      };

      it('should generate both web and ns module files', async () => {
        const options = { ...nsWebOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
        expect(tree.exists(nsModulePath)).toBeTruthy();
        expect(tree.exists(webModulePath)).toBeTruthy();
      });

      it('should create a common file', async () => {
        const options = { ...nsWebOptions };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        expect(tree.exists(commonFilePath)).toBeTruthy();
      });

      it('should create both routing modules when routing flag is passed', async () => {
        const options = { ...nsWebOptions, routing: true };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();
        expect(tree.exists(nsRoutingModulePath)).toBeTruthy();
        expect(tree.exists(webRoutingModulePath)).toBeTruthy();
      });

      it('should respect passed extension', async () => {
        const nsExtension = '.mobile';
        const webExtension = '.web';
        const options = { ...nsWebOptions, nsExtension, webExtension, routing: true };
        const tree = await schematicRunner.runSchematicAsync('module', options, appTree).toPromise();

        const customWebModulePath = getModulePath(webExtension);
        const customNsModulePath = getModulePath(nsExtension);
        expect(tree.exists(customWebModulePath)).toBeTruthy();
        expect(tree.exists(customNsModulePath)).toBeTruthy();

        expect(tree.exists(customWebModulePath)).toBeTruthy();
        expect(tree.exists(customNsModulePath)).toBeTruthy();

        const customWebRoutingModulePath = getRoutingModulePath(webExtension);
        const customNsRoutingModulePath = getRoutingModulePath(nsExtension);
        expect(tree.exists(customWebRoutingModulePath)).toBeTruthy();
        expect(tree.exists(customNsRoutingModulePath)).toBeTruthy();
      });
    });
  });
});
