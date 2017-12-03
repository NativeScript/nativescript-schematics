import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';

import { Schema as ComponentOptions } from './schema';
import { Tree, VirtualTree } from '@angular-devkit/schematics';

describe('Component Schematic', () => {
  const path = 'app';
  const sourceDir = 'app';
  const name = 'foo';
  const options: ComponentOptions = { name, path, sourceDir };
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );
  let tree: UnitTestTree;
  
  beforeAll(() => {
    const appTree = createAppModule(new VirtualTree(), `/${sourceDir}/${path}/app.module.ts`);
    tree = schematicRunner.runSchematic('component', options, appTree);
  });
  
  it('should create four files', () => {
    expect(tree.files.length).toEqual(4);
  });

  it('should add {N}-specific markup file', () => {
    const content = getFileContent(tree, `${sourceDir}/${path}/${name}/${name}.component.html`);
    expect(content).toMatch(/Button/);
  });

  it('should add module id', () => {
    const content = getFileContent(tree, `${sourceDir}/${path}/${name}/${name}.component.ts`);
    expect(content).toMatch(/moduleId: module\.id/);
  });
});
