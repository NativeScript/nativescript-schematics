import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';

import { toComponentClassName } from '../../utils';
import { createEmptyNsOnlyProject, createEmptySharedProject } from '../../test-utils';
import { DEFAULT_SHARED_EXTENSIONS } from '../utils';
import { isInComponentMetadata, isInModuleMetadata } from '../../test-utils';
import { Schema as ComponentOptions } from './schema';
import { findImports, getSourceFile } from '../../ts-utils';

describe('Component Schematic', () => {
  const name = 'foo';
  const project = 'leproj';
  const importPrefix = '@src';
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

  const getStylesheetPath = (extension: string, styleExtension: string = 'css') =>
    `src/app/${name}/${name}.component${extension}.${styleExtension}`;
  const noExtensionStylesheetPath = getStylesheetPath('');
  const nsStylesheetPath = getStylesheetPath(DEFAULT_SHARED_EXTENSIONS.ns);
  const webStylesheetPath = getStylesheetPath(DEFAULT_SHARED_EXTENSIONS.web);

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

  describe('when in ns-only project', async () => {
    beforeAll(async () => {
      appTree = createEmptyNsOnlyProject(project);

      const options = { ...defaultOptions, nativescript: true, web: false };
      appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
    });

    it('should create template without extension', () =>
      expect(appTree.exists(noExtensionTemplatePath)).toBeTruthy());
    it('should not create template with {N} extension', () =>
      expect(appTree.exists(nsTemplatePath)).toBeFalsy());
    it('should add {N}-specific markup in template', () => ensureNsTemplate(appTree, noExtensionTemplatePath));

    it('should create stylesheet without extension', () =>
      expect(appTree.exists(noExtensionStylesheetPath)).toBeTruthy());
    it('should not create stylesheet with {N} extension', () =>
      expect(appTree.exists(nsStylesheetPath)).toBeFalsy());

    it('should add module id', () => expect(hasModuleId()).toBeTruthy());

    it('should declare the component in the root NgModule for {N}', () => {
      const nsModuleContent = getFileContent(appTree, rootModulePath);
      expect(nsModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
    });
  });

  describe('when in ns-only project, create a component in /home folder', () => {
    const homeDir = 'home'
    const componentName = `${homeDir}/${name}`;
    const componentPath = `src/app/${homeDir}/${name}/${name}.component.ts`;
    const templatePath = `src/app/${homeDir}/${name}/${name}.component.html`;

    beforeAll(async () => {
      appTree = createEmptyNsOnlyProject(project);

      const options = { ...defaultOptions, name: componentName, nativescript: true, web: false };
      appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
    });

    it('should create component in the home folder', () =>
      expect(appTree.exists(componentPath)).toBeTruthy());

    it('should create template in the home folder', () =>
      expect(appTree.exists(templatePath)).toBeTruthy());

    it('should declare the component in the root NgModule for {N} using name FooComponent with the import to home/foo', () => {
      const nsModuleContent = getFileContent(appTree, rootModulePath);
      expect(nsModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
    });
  });

  describe('when in ns+web project', () => {
    describe('executing ns+web schematic', () => {
      beforeAll(async () => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: true, nativescript: true };
        appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
      });

      it('should add web-specific markup file', () => ensureWebTemplate(appTree, webTemplatePath));
      it('should add {N}-specific markup file', () => ensureNsTemplate(appTree, nsTemplatePath));

      it('should add web-specific stylesheet file', () =>
        expect(appTree.exists(webStylesheetPath)).toBeTruthy());
      it('should add {N}-specific stylesheet file', () =>
        expect(appTree.exists(nsStylesheetPath)).toBeTruthy());

      it('should add module id', () => expect(hasModuleId()).toBeFalsy());

      it('should declare the component in the the root NgModule for web', () => {
        const webModuleContent = getFileContent(appTree, rootModulePath);
        expect(webModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });

      it('should declare the component in the root NgModule for {N}', () => {
        const nsModuleContent = getFileContent(appTree, rootNsModulePath);
        expect(nsModuleContent).toMatch(isInModuleMetadata('AppModule', 'declarations', componentClassName, true));
      });

      it('should import the component in the root NgModule for {N} using @src', () => {
        const source = getSourceFile(appTree, rootModulePath);
        const imports = findImports(componentClassName, source);

        expect(imports.length).toEqual(1);
        expect(imports[0].getFullText()).toContain(`${importPrefix}/app/${name}/${name}.component`)
      });

      it('should import the component in the root NgModule for {N} using @src', () => {
        const source = getSourceFile(appTree, rootNsModulePath);
        const imports = findImports(componentClassName, source);

        expect(imports.length).toEqual(1);
        expect(imports[0].getFullText()).toContain(`${importPrefix}/app/${name}/${name}.component`)
      });
    })

    describe('executing ns-only schematic', () => {
      beforeAll(async () => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: false, nativescript: true };
        appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
      });

      it('should add {N}-specific markup file', () => ensureNsTemplate(appTree, nsTemplatePath));
      it('should add {N}-specific stylesheet file', () =>
        expect(appTree.exists(nsStylesheetPath)).toBeTruthy());
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
      beforeAll(async () => {
        appTree = createEmptySharedProject(project);

        const options = { ...defaultOptions, web: true, nativescript: false };
        appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
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
      const customExtension = '.mobile';
      beforeEach(() => {
        appTree = createEmptyNsOnlyProject(project, customExtension);
      });

      it('should respect specified {N} extension', async () => {
        const options = { ...defaultOptions, nsExtension: customExtension, nativescript: true };
        appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

        const componentTemplatePath = getTemplatePath(customExtension);
        expect(appTree.exists(componentTemplatePath)).toBeTruthy();

        const componentStylesheetPath = getStylesheetPath(customExtension);
        expect(appTree.exists(componentStylesheetPath)).toBeTruthy();
      });

      it('should respect specified style extension', async () => {
        const styleext = 'scss';
        const options = { ...defaultOptions, nsExtension: customExtension, styleext, nativescript: true };
        appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

        const componentStylesheetPath = getStylesheetPath(customExtension, styleext);
        expect(appTree.exists(componentStylesheetPath)).toBeTruthy();
      });
    });

    describe('in ns+web project', () => {
      describe('when a custom web extension is specified', () => {
        const customExtension = '.web';
        const componentOptions = { ...defaultOptions, webExtension: customExtension, web: true };

        beforeEach(() => {
          appTree = createEmptySharedProject(project, customExtension, '.tns');
        });

        it('should create the files with this extension', async () => {
          const options = { ...componentOptions };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

          const componentTemplatePath = getTemplatePath(customExtension);
          expect(appTree.exists(componentTemplatePath)).toBeTruthy();
        });

        it('should declare in NgModule', async () => {
          const options = { ...componentOptions };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

          const webModulePath = `src/app/app.module${customExtension}.ts`;
          const nsModulePath = `src/app/app.module.tns.ts`;
          const matcher = isInModuleMetadata('AppModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });

        it('should respect the module option', async () => {
          const moduleName = 'random';
          const webModulePath = `src/app/${moduleName}/${moduleName}.module${customExtension}.ts`;
          const nsModulePath = `src/app/${moduleName}/${moduleName}.module.tns.ts`;
          appTree = await schematicRunner.runSchematicAsync('module', {
            project,
            name: moduleName,
            webExtension: customExtension,
          }, appTree).toPromise();

          const options = { ...componentOptions, module: moduleName };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

          const matcher = isInModuleMetadata('RandomModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });
      });

      describe('when a custom {N} extension is specified', () => {
        const customExtension = '.mobile';
        const componentOptions = { ...defaultOptions, nsExtension: customExtension, nativescript: true };

        beforeEach(() => {
          appTree = createEmptySharedProject(project, '', customExtension);
        });

        it('should create the files with this extension', async () => {
          const options = { ...componentOptions };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

          const componentTemplatePath = getTemplatePath(customExtension);
          expect(appTree.exists(componentTemplatePath)).toBeTruthy();

          const componentStylesheetPath = getStylesheetPath(customExtension);
          expect(appTree.exists(componentStylesheetPath)).toBeTruthy();
        });

        it('should declare in NgModule', async () => {
          const options = { ...componentOptions };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

          const webModulePath = `src/app/app.module.ts`;
          const nsModulePath = `src/app/app.module${customExtension}.ts`;
          const matcher = isInModuleMetadata('AppModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });

        it('should respect the module option', async () => {
          const moduleName = 'random';
          const webModulePath = `src/app/${moduleName}/${moduleName}.module.ts`;
          const nsModulePath = `src/app/${moduleName}/${moduleName}.module${customExtension}.ts`;
          appTree = await schematicRunner.runSchematicAsync('module', {
            project,
            name: moduleName,
            nsExtension: customExtension,
          }, appTree).toPromise();

          const options = { ...componentOptions, module: moduleName };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

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

        it('should create the files with these extensions', async () => {
          const options = { ...componentOptions };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

          const nsTemplate = getTemplatePath(nsExtension);
          const webTemplate = getTemplatePath(webExtension);
          expect(appTree.exists(nsTemplate)).toBeTruthy();
          expect(appTree.exists(webTemplate)).toBeTruthy();

          const nsStylesheet = getStylesheetPath(nsExtension);
          const webStylesheet = getStylesheetPath(webExtension);
          expect(appTree.exists(nsStylesheet)).toBeTruthy();
          expect(appTree.exists(webStylesheet)).toBeTruthy();
        });

        it('should declare in NgModule', async () => {
          const options = { ...componentOptions };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

          const webModulePath = `src/app/app.module${webExtension}.ts`;
          const nsModulePath = `src/app/app.module${nsExtension}.ts`;
          const matcher = isInModuleMetadata('AppModule', 'declarations', componentClassName, true);

          const webModuleContent = getFileContent(appTree, webModulePath);
          expect(webModuleContent).toMatch(matcher);

          const nsModuleContent = getFileContent(appTree, nsModulePath);
          expect(nsModuleContent).toMatch(matcher);
        });

        it('should respect the module option', async () => {
          const moduleName = 'random';
          const webModulePath = `src/app/${moduleName}/${moduleName}.module${webExtension}.ts`;
          const nsModulePath = `src/app/${moduleName}/${moduleName}.module${nsExtension}.ts`;
          appTree = await schematicRunner.runSchematicAsync('module', {
            project,
            name: moduleName,
            webExtension,
            nsExtension,
          }, appTree).toPromise();

          const options = { ...componentOptions, module: moduleName };
          appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

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
