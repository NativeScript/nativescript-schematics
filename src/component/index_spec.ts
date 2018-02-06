import { join } from 'path';

import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';
import { VirtualTree } from '@angular-devkit/schematics';

import { createEmptyProject, toComponentClassName } from '../utils';
import { isInComponentMetadata } from '../test-utils';
import { Schema as ComponentOptions } from './schema';

describe('Component Schematic', () => {
  const path = 'app';
  const sourceDir = 'app';
  const name = 'foo';
  const componentClassName = toComponentClassName(name);
  const defaultOptions: ComponentOptions = { name, path, sourceDir };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );

  const componentPath = `${sourceDir}/${path}/${name}/${name}.component.ts`;
  const nsTemplatePath = `${sourceDir}/${path}/${name}/${name}.component.tns.html`;
  const webTemplatePath = `${sourceDir}/${path}/${name}/${name}.component.html`;
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

  const ensureWebTemplate = () => {
    expect(tree.exists(webTemplatePath)).toBeTruthy();

    const content = getFileContent(tree, webTemplatePath);
    expect(content).toMatch(/\<p\>/);
  };

  const ensureNsTemplate = () => {
    expect(tree.exists(nsTemplatePath)).toBeTruthy();

    const content = getFileContent(tree, nsTemplatePath);
    expect(content).toMatch(/Button/);
  };

  describe('when in ns-only project', () => {
    beforeEach(() => {
      const options = { ...defaultOptions, nativescript: true, web: false };
      tree = schematicRunner.runSchematic('component', options, appTree);
    });

    it('should add {N}-specific markup file', ensureNsTemplate);
    it('should add module id', () => expect(hasModuleId()).toBeTruthy());
  });

  describe('when in web-only project', () => {
    beforeEach(() => {
      const options = { ...defaultOptions, nativescript: false, web: true };
      tree = schematicRunner.runSchematic('component', options, appTree);
    });

    it('should add web-specific markup file', ensureWebTemplate);
    it('should add module id', () => expect(hasModuleId()).toBeFalsy());
  });

  describe('when in ns+web project', () => {
    beforeEach(() => {
      const options = { ...defaultOptions, web: true, nativescript: true };
      tree = schematicRunner.runSchematic('component', options, appTree);
    });

    it('should add web-specific markup file', ensureWebTemplate);
    it('should add {N}-specific markup file', ensureNsTemplate);

    it('should add module id', () => expect(hasModuleId()).toBeTruthy());
  });
});
