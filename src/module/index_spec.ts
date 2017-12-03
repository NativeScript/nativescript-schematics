import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';

import { Schema as ModuleOptions } from './schema';
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { capitalize } from '@angular-devkit/core';

describe('Module Schematic', () => {
  const path = 'app';
  const sourceDir = 'app';
  const name = 'foo';
  const defaultOptions: ModuleOptions = {
    name,
    path,
    sourceDir,
  };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );
  const moduleClassName = `${capitalize(name)}Module`;
  const modulePath = `/${sourceDir}/${path}/${name}/${name}.module.ts`;
  const routingModulePath = `/${sourceDir}/${path}/${name}/${name}-routing.module.ts`;
  let appTree: Tree;
  
  beforeAll(() => {
    appTree = createAppModule(new VirtualTree());
  });
  
  it('should create three files', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('module', options, appTree);

    expect(tree.files.indexOf(modulePath)).toBeGreaterThanOrEqual(0);
    expect(tree.files.length).toEqual(3);
  });

  it('should not have CommonModule imported', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('module', options, appTree);

    const content = getFileContent(tree, modulePath);
    expect(content).not.toMatch(`import { CommonModule } from '@angular/common'`);

    expect(content).not.toMatch(new RegExp(
      '@NgModule\\(\\{\\s*' +
        'imports: \\[(\\s*|(\\s*\\.*),(\\s*))' +
          'CommonModule'
    ));
  });

  it('should have NativeScriptCommonModule imported', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('module', options, appTree);

    const content = getFileContent(tree, modulePath);
    expect(content).toMatch(`import { NativeScriptCommonModule } from 'nativescript-angular/common'`);
  });

  it('should not have NativeScriptCommonModule imported if that is specified explicitly', () => {
    const options = { ...defaultOptions, commonModule: false };
    const tree = schematicRunner.runSchematic('module', options, appTree);

    const content = getFileContent(tree, modulePath);
    expect(content).not.toMatch(`import { NativeScriptCommonModule } from 'nativescript-angular/common'`);
  });

  it('should not have RouterModule imported in the routing module', () => {
    const options = { ...defaultOptions, routing: true };
    const tree = schematicRunner.runSchematic('module', options, appTree);

    const content = getFileContent(tree, routingModulePath);
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

    const content = getFileContent(tree, routingModulePath);
    expect(content).toMatch(`import { NativeScriptRouterModule } from 'nativescript-angular/router'`);
  });
});
