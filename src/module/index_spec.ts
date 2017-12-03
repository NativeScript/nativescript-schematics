import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';

import { Schema as ModuleOptions } from './schema';
import { Tree, VirtualTree } from '@angular-devkit/schematics';
import { capitalize } from '@angular-devkit/core';

describe('Interface Schematic', () => {
  const path = 'app';
  const sourceDir = 'app';
  const name = 'foo';
  const defaultOptions: ModuleOptions = { name, path, sourceDir };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );
  const modulePath = `/${sourceDir}/${path}/${name}/${name}.module.ts`;
  let appTree: Tree;
  
  beforeAll(() => {
    appTree = createAppModule(new VirtualTree());
  });
  
  it('should create two files', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('module', options, appTree);

    expect(tree.files.indexOf(modulePath)).toBeGreaterThanOrEqual(0);
    tree.files.forEach(f => console.log(getFileContent(tree, f)));
    expect(tree.files.length).toEqual(2);
  });

  it('should filter out the spec files', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('module', options, appTree);

    const containsSpecFile = tree.files.some(f => !!f.match(/\.spec\.ts$/));
    expect(containsSpecFile).toBeFalsy();
  })
});
