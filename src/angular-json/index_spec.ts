import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import { Schema as angularJsonOptions } from './schema';

describe('Angular JSON Config Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    path.join(__dirname, '../collection.json'),
  );

  const projName = "leproj"
  const defaultOptions: angularJsonOptions = {
    name: projName,
  };
  const configPath = `/angular.json`;


  describe("with default options (name only)", () => {
    let tree: UnitTestTree;
    beforeAll(() => {
      tree = schematicRunner.runSchematic('angular-json', defaultOptions);
    })

    it('should create angular.json files', () => {
      expect(tree.files.indexOf(configPath)).toBeGreaterThanOrEqual(0);
    });

    it('should insert the project name', () => {
      expect(getFileContent(tree, configPath)).toContain(`"${projName}":`);
    });
  })

  it('should insert the prefix option', () => {
    const prefix = 'custom-prefix';
    const tree = schematicRunner.runSchematic('angular-json', { ...defaultOptions, prefix });
    expect(getFileContent(tree, configPath)).toContain(`"prefix": "${prefix}"`);
  });

  it('should create files inside path when specified', () => {
    const path = "/path/to/my/app";
    const appJsonPath = `${path}/angular.json`;
    const options = { ...defaultOptions, path };

    const tree = schematicRunner.runSchematic('angular-json', options);
    expect(tree.files.indexOf(appJsonPath)).toBeGreaterThanOrEqual(0);
  });
});