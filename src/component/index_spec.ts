import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { getFileContent, createAppModule } from '@schematics/angular/utility/test';
import { Schema as ComponentOptions } from './schema';
import { Tree, VirtualTree } from '@angular-devkit/schematics';

describe('Interface Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ComponentOptions = {
    name: 'foo',
    path: 'app',
    sourceDir: 'app',
  };
  
  
  let appTree: Tree;
  
  beforeEach(() => {
    appTree = new VirtualTree();
    appTree = createAppModule(appTree, '/app/app/app.module.ts');
  });
  
  it('should create one file', () => {
    const tree = schematicRunner.runSchematic('component', defaultOptions);
    expect(tree.files.length).toEqual(1);
    expect(tree.files[0]).toEqual('/app/app/foo.ts');
  });
});
