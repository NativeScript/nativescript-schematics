import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';

import { createEmptyNsOnlyProject, createEmptySharedProject, toComponentClassName } from '../../utils';
import { DEFAULT_SHARED_EXTENSIONS } from '../utils';
import { isInComponentMetadata } from '../../test-utils';
import { Schema as ComponentOptions } from './schema';

describe('Component Schematic', () => {
  const name = 'foo';
  const project = 'leproj';
  const componentClassName = toComponentClassName(name);

  const defaultOptions: ComponentOptions = { name, project };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../../collection.json'),
  );

  const componentPath = `src/app/${name}/${name}.component.ts`;

  const getTemplatePath = (extension: string) => `src/app/${name}/${name}.component${extension}.html`;

  const noExtensionTemplatePath = getTemplatePath('');
  const nsTemplatePath = getTemplatePath(DEFAULT_SHARED_EXTENSIONS.ns);
  const webTemplatePath = getTemplatePath(DEFAULT_SHARED_EXTENSIONS.web);

  let appTree: UnitTestTree;

  const hasModuleId = () => {
    const content = getFileContent(appTree, componentPath);
    const matcher = isInComponentMetadata(componentClassName, 'moduleId', 'module.id', false);
    return content.match(matcher);
  };

  const ensureWebTemplate = (tree: UnitTestTree, path: string) => {
    expect(tree.exists(path)).toBeTruthy();

    const content = getFileContent(tree, webTemplatePath);
    expect(content).toMatch(/\<p\>/);
  };

  const ensureNsTemplate = (tree: UnitTestTree, path: string) => {
    expect(tree.exists(path)).toBeTruthy();

    const content = getFileContent(tree, path);
    expect(content).toMatch(/Button/);
  };

  describe('when in ns-only project', () => {
    beforeAll(() => {
      appTree = createEmptyNsOnlyProject(project);

      const options = { ...defaultOptions, nativescript: true, web: false };
      appTree = schematicRunner.runSchematic('component', options, appTree);
    });

    it('should create template without extension', () =>
      expect(appTree.exists(noExtensionTemplatePath)).toBeTruthy());
    it('should not create template with {N} extension', () =>
      expect(appTree.exists(nsTemplatePath)).toBeFalsy());
    it('should add {N}-specific markup in template', () => ensureNsTemplate(appTree, noExtensionTemplatePath));
    it('should add module id', () => expect(hasModuleId()).toBeTruthy());
  });

  describe('when in ns+web project', () => {
    describe('executing ns+web schematic', () => {
      beforeAll(() => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: true, nativescript: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);
      });

      it('should add web-specific markup file', () => ensureWebTemplate(appTree, webTemplatePath));
      it('should add {N}-specific markup file', () => ensureNsTemplate(appTree, nsTemplatePath));
      it('should add module id', () => expect(hasModuleId()).toBeFalsy());
    })

    describe('executing ns-only schematic', () => {
      beforeAll(() => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: false, nativescript: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);
      });

      it('should add {N}-specific markup file', () => ensureNsTemplate(appTree, nsTemplatePath));
      it('should add module id', () => expect(hasModuleId()).toBeFalsy());
    })

    describe('executing web-only schematic', () => {
      beforeAll(() => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: true, nativescript: false };
        appTree = schematicRunner.runSchematic('component', options, appTree);
      });

      it('should add web-specific markup file', () => ensureWebTemplate(appTree, webTemplatePath));
      it('should add module id', () => expect(hasModuleId()).toBeFalsy());
    })
  });

  describe('specifying custom extension', () => {
    describe('in ns only project', () => {
      beforeEach(() => {
        appTree = createEmptyNsOnlyProject(project);
      });

      it('should respect specified {N} extension', () => {
        const customExtension = '.mobile';
        const options = { ...defaultOptions, nsExtension: customExtension, nativescript: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);

        const componentTemplatePath = getTemplatePath(customExtension);
        expect(appTree.exists(componentTemplatePath)).toBeTruthy();
      });
    })
    describe('in ns+web project', () => {
      beforeEach(() => {
        appTree = createEmptySharedProject(project);
      });

      it('should respect specified {N} extension', () => {
        const customExtension = '.mobile';
        const options = { ...defaultOptions, nsExtension: customExtension, nativescript: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);

        const componentTemplatePath = getTemplatePath(customExtension);
        expect(appTree.exists(componentTemplatePath)).toBeTruthy();
      });

      it('should respect specified web extension', () => {
        const customExtension = '.web';
        const options = { ...defaultOptions, webExtension: customExtension, web: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);

        const componentTemplatePath = getTemplatePath(customExtension);
        expect(appTree.exists(componentTemplatePath)).toBeTruthy();
      });

      it('should respect both web and {N} extensions', () => {
        const nsExtension = '.mobile';
        const webExtension = '.web';
        const options = { ...defaultOptions, nsExtension, webExtension, web: true, nativescript: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);

        const nsTemplate = getTemplatePath(nsExtension);
        const webTemplate = getTemplatePath(webExtension);
        expect(appTree.exists(nsTemplate)).toBeTruthy();
        expect(appTree.exists(webTemplate)).toBeTruthy();
      });

    })
  });
});
