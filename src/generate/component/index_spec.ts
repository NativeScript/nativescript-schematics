import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';

import { createEmptyNsOnlyProject, createEmptySharedProject, toComponentClassName, callRuleSync } from '../../utils';
import { DEFAULT_SHARED_EXTENSIONS } from '../utils';
import { isInComponentMetadata, isInModuleMetadata } from '../../test-utils';
import { Schema as ComponentOptions } from './schema';
import { Schema as ApplicationOptions } from '../../ng-new/shared/schema';
import { move } from '@angular-devkit/schematics';

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
  const rootModulePath = `src/app/app.module.ts`;
  const rootNsModulePath = `src/app/app.module.tns.ts`;

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

    it('should declare the component in the root NgModule for {N}', () => {
      const nsModuleContent = getFileContent(appTree, rootModulePath);
      expect(nsModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
    });
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

      it('should declare the component in the the root NgModule for web', () => {
        const webModuleContent = getFileContent(appTree, rootModulePath);
        expect(webModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });

      it('should declare the component in the root NgModule for {N}', () => {
        const nsModuleContent = getFileContent(appTree, rootNsModulePath);
        expect(nsModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });
    })

    describe('executing ns-only schematic', () => {
      beforeAll(() => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: false, nativescript: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);
      });

      it('should add {N}-specific markup file', () => ensureNsTemplate(appTree, nsTemplatePath));
      it('should add module id', () => expect(hasModuleId()).toBeFalsy());

      it('should not declare the component in the the root NgModule for web', () => {
        const webModuleContent = getFileContent(appTree, rootModulePath);
        expect(webModuleContent).not.toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });

      it('should declare the component in the root NgModule for {N}', () => {
        const nsModuleContent = getFileContent(appTree, rootNsModulePath);
        expect(nsModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });
    })

    describe('executing web-only schematic', () => {
      beforeAll(() => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: true, nativescript: false };
        appTree = schematicRunner.runSchematic('component', options, appTree);
      });

      it('should add web-specific markup file', () => ensureWebTemplate(appTree, webTemplatePath));
      it('should add module id', () => expect(hasModuleId()).toBeFalsy());

      it('should declare the component in the the root NgModule for web', () => {
        const webModuleContent = getFileContent(appTree, rootModulePath);
        expect(webModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });

      it('should not declare the component in the root NgModule for {N}', () => {
        const nsModuleContent = getFileContent(appTree, rootNsModulePath);
        expect(nsModuleContent).not.toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });
    })
  });

  describe('specifying custom extension', () => {
    describe('in ns only project', () => {
      beforeEach(() => {
        appTree = createEmptyNsOnlyProject(project, '.mobile');
      });

      it('should respect specified {N} extension', () => {
        const customExtension = '.mobile';
        const options = { ...defaultOptions, nsExtension: customExtension, nativescript: true };
        appTree = schematicRunner.runSchematic('component', options, appTree);

        const componentTemplatePath = getTemplatePath(customExtension);
        expect(appTree.exists(componentTemplatePath)).toBeTruthy();
      });
    });

    describe('in ns+web project', () => {
      describe('when a custom web extension is specified', () => {
        const customExtension = '.web';
        const componentOptions = { ...defaultOptions, webExtension: customExtension, web: true };

        beforeEach(() => {
          appTree = createEmptySharedProject(project, customExtension, '.tns');
        });

        it('should create the files with this extension', () => {
          const options = { ...componentOptions };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const componentTemplatePath = getTemplatePath(customExtension);
          expect(appTree.exists(componentTemplatePath)).toBeTruthy();
        });

        it('should declare in NgModule', () => {
          const options = { ...componentOptions };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const webModulePath = `src/app/app.module${customExtension}.ts`;
          const nsModulePath = `src/app/app.module.tns.ts`;
          const matcher = isInModuleMetadata('AppModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });

        it('should respect the module option', () => {
          const moduleName = 'random';
          const webModulePath = `src/app/${moduleName}/${moduleName}.module${customExtension}.ts`;
          const nsModulePath = `src/app/${moduleName}/${moduleName}.module.tns.ts`;
          appTree = schematicRunner.runSchematic('module', {
            project,
            name: moduleName,
            webExtension: customExtension,
          }, appTree);

          const options = { ...componentOptions, module: moduleName };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const matcher = isInModuleMetadata('RandomModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });
      });

      describe('when a custon {N} extension is specified', () => {
        const customExtension = '.mobile';
        const componentOptions = { ...defaultOptions, nsExtension: customExtension, nativescript: true };

        beforeEach(() => {
          appTree = createEmptySharedProject(project, '', customExtension);
        });

        it('should create the files with this extension', () => {
          const options = { ...componentOptions };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const componentTemplatePath = getTemplatePath(customExtension);
          expect(appTree.exists(componentTemplatePath)).toBeTruthy();
        });

        it('should declare in NgModule', () => {
          const options = { ...componentOptions };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const webModulePath = `src/app/app.module.ts`;
          const nsModulePath = `src/app/app.module${customExtension}.ts`;
          const matcher = isInModuleMetadata('AppModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });

        it('should respect the module option', () => {
          const moduleName = 'random';
          const webModulePath = `src/app/${moduleName}/${moduleName}.module.ts`;
          const nsModulePath = `src/app/${moduleName}/${moduleName}.module${customExtension}.ts`;
          appTree = schematicRunner.runSchematic('module', {
            project,
            name: moduleName,
            nsExtension: customExtension,
          }, appTree);

          const options = { ...componentOptions, module: moduleName };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const matcher = isInModuleMetadata('RandomModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });
      });

      describe('when custom web and {N} extensions are specified', () => {
        const nsExtension = '.mobile';
        const webExtension = '.web';
        const componentOptions = { ...defaultOptions, nsExtension, webExtension, web: true, nativescript: true };

        beforeEach(() => {
          appTree = createEmptySharedProject(project, webExtension, nsExtension);
        });

        it('should create the files with these extensions', () => {
          const options = { ...componentOptions };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const nsTemplate = getTemplatePath(nsExtension);
          const webTemplate = getTemplatePath(webExtension);
          expect(appTree.exists(nsTemplate)).toBeTruthy();
          expect(appTree.exists(webTemplate)).toBeTruthy();
        });

        it('should declare in NgModule', () => {
          const options = { ...componentOptions };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const webModulePath = `src/app/app.module${webExtension}.ts`;
          const nsModulePath = `src/app/app.module${nsExtension}.ts`;
          const matcher = isInModuleMetadata('AppModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });

        it('should respect the module option', () => {
          const moduleName = 'random';
          const webModulePath = `src/app/${moduleName}/${moduleName}.module${webExtension}.ts`;
          const nsModulePath = `src/app/${moduleName}/${moduleName}.module${nsExtension}.ts`;
          appTree = schematicRunner.runSchematic('module', {
            project,
            name: moduleName,
            webExtension,
            nsExtension,
          }, appTree);

          const options = { ...componentOptions, module: moduleName };
          appTree = schematicRunner.runSchematic('component', options, appTree);

          const matcher = isInModuleMetadata('RandomModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });
      });
    })
  });
});
