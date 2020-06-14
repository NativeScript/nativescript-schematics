import * as path from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import { Schema as angularJsonOptions } from './schema';

describe('Angular JSON Config Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@nativescript/schematics',
    path.join(__dirname, '../collection.json'),
  );

  const projName = 'leproj';
  const defaultOptions: angularJsonOptions = {
    name: projName,
  };
  const configPath = `/angular.json`;

  describe('with default options (name only)', () => {
    let tree: UnitTestTree;
    beforeAll(async () => {
      tree = await schematicRunner.runSchematicAsync('angular-json', defaultOptions).toPromise();
    });

    it('should create angular.json files', () => {
      expect(tree.files).toContain(configPath);
    });

    it('should insert the project name', () => {
      expect(getFileContent(tree, configPath)).toContain(`"${projName}":`);
    });

    it('should insert "." as sourceRoot', () => {
      expect(getFileContent(tree, configPath)).toContain(`"sourceRoot": "."`);
    });
  });

  it('should insert the prefix option', async () => {
    const prefix = 'custom-prefix';
    const tree = await schematicRunner.runSchematicAsync('angular-json', { ...defaultOptions, prefix }).toPromise();
    expect(getFileContent(tree, configPath)).toContain(`"prefix": "${prefix}"`);
  });

  it('should insert the sourceRoot option', async () => {
    const sourceRoot = 'src';
    const tree = await schematicRunner.runSchematicAsync('angular-json', { ...defaultOptions, sourceRoot }).toPromise();
    expect(getFileContent(tree, configPath)).toContain(`"sourceRoot": "${sourceRoot}"`);
  });

  it('should create files inside path when specified', async () => {
    const projectPath = '/path/to/my/app';
    const appJsonPath = `${projectPath}/angular.json`;
    const options = { ...defaultOptions, path: projectPath };

    const tree = await schematicRunner.runSchematicAsync('angular-json', options).toPromise();
    expect(tree.files).toContain(appJsonPath);
  });
});
