import { join } from 'path';

import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';
import { VirtualTree } from '@angular-devkit/schematics';

import { createEmptyProject, toComponentClassName } from '../../utils';
import { DEFAULT_SHARED_EXTENSIONS } from '../utils';
import { isInComponentMetadata } from '../../test-utils';
import { Schema as ComponentOptions } from './schema';

describe('Component Schematic', () => {
  const path = 'app';
  const sourceDir = 'app';
  const name = 'foo';
  const project = 'needs-a-name-for-angular-json';
  const componentClassName = toComponentClassName(name);
  const defaultOptions: ComponentOptions = { name, path, project };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );

  const componentPath = `${sourceDir}/${path}/${name}/${name}.component.ts`;

  const getTemplatePath = (extension: string) =>
    `${sourceDir}/${path}/${name}/${name}.component${extension}.html`;
  const noExtensionTemplatePath = getTemplatePath('');
  const nsTemplatePath = getTemplatePath(DEFAULT_SHARED_EXTENSIONS.ns);
  const webTemplatePath = getTemplatePath(DEFAULT_SHARED_EXTENSIONS.web);

  let appTree;
  let tree;
  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree, `/${sourceDir}/${path}/app.module.ts`);
    appTree = createEmptyProject(appTree);
  });

  const hasModuleId = () => {
    const content = getFileContent(tree, componentPath);
    const matcher = isInComponentMetadata(componentClassName, 'moduleId', 'module.id', false);
    return content.match(matcher);
  };

  const ensureWebTemplate = (tree: VirtualTree, path: string) => {
    expect(tree.exists(path)).toBeTruthy();

    const content = getFileContent(tree, webTemplatePath);
    expect(content).toMatch(/\<p\>/);
  };

  const ensureNsTemplate = (tree: VirtualTree, path: string) => {
    expect(tree.exists(path)).toBeTruthy();

    const content = getFileContent(tree, path);
    expect(content).toMatch(/Button/);
  };

  describe('when in ns-only project', () => {
    beforeEach(() => {
      const options = { ...defaultOptions, nativescript: true, web: false };
      tree = schematicRunner.runSchematic('component', options, appTree);
    });

    it('should create template without extension', () =>
      expect(tree.exists(noExtensionTemplatePath)).toBeTruthy());
    it('should not create template with {N} extension', () =>
      expect(tree.exists(nsTemplatePath)).toBeFalsy());
    it('should add {N}-specific markup in template', () => ensureNsTemplate(tree, noExtensionTemplatePath));
    it('should add module id', () => expect(hasModuleId()).toBeTruthy());
  });

  describe('when in web-only project', () => {
    beforeEach(() => {
      const options = { ...defaultOptions, nativescript: false, web: true };
      tree = schematicRunner.runSchematic('component', options, appTree);
    });

    it('should add web-specific markup file', () => ensureWebTemplate(tree, webTemplatePath));
    it('should add module id', () => expect(hasModuleId()).toBeFalsy());
  });

  describe('when in ns+web project', () => {
    beforeEach(() => {
      const options = { ...defaultOptions, web: true, nativescript: true };
      tree = schematicRunner.runSchematic('component', options, appTree);
    });

    it('should add web-specific markup file', () => ensureWebTemplate(tree ,webTemplatePath));
    it('should add {N}-specific markup file', () => ensureNsTemplate(tree ,nsTemplatePath));

    it('should add module id', () => expect(hasModuleId()).toBeTruthy());
  });

  describe('specifying custom extension', () => {
    it('should respect specified {N} extension', () => {
      const customExtension = '.mobile';
      const options = { ...defaultOptions, nsExtension: customExtension, nativescript: true };
      tree = schematicRunner.runSchematic('component', options, appTree);

      const componentTemplatePath = getTemplatePath(customExtension);
      expect(tree.exists(componentTemplatePath)).toBeTruthy();
    });

    it('should respect specified web extension', () => {
      const customExtension = '.web';
      const options = { ...defaultOptions, webExtension: customExtension, web: true };
      tree = schematicRunner.runSchematic('component', options, appTree);

      const componentTemplatePath = getTemplatePath(customExtension);
      expect(tree.exists(componentTemplatePath)).toBeTruthy();
    });

    it('should respect both web and {N} extensions', () => {
      const nsExtension = '.mobile';
      const webExtension = '.web';
      const options = { ...defaultOptions, nsExtension, webExtension, web: true, nativescript: true };
      tree = schematicRunner.runSchematic('component', options, appTree);

      const nsTemplate = getTemplatePath(nsExtension);
      const webTemplate = getTemplatePath(webExtension);
      expect(tree.exists(nsTemplate)).toBeTruthy();
      expect(tree.exists(webTemplate)).toBeTruthy();
    });
  });
});
