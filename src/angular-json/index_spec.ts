import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import * as path from 'path';

import { Schema as NgCliConfigOptions } from './schema';

describe('Angular JSON Config Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    path.join(__dirname, '../collection.json'),
  );
  const appPath = 'foo';
  const defaultOptions: NgCliConfigOptions = {
    name: 'test', // TODO: make sure it is a correct name
    path: appPath,
    prefix: 'app',
  };
  const configPath = `/${appPath}/angular.json`;

  it('should create all files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('angular-json', options);
    const files = tree.files;
    expect(files.indexOf(configPath)).toBeGreaterThanOrEqual(0);
  }); 

  it('should handle the prefix option', () => {
    const prefix = 'my-app-prefix';
    const options = { ...defaultOptions, prefix };

    const tree = schematicRunner.runSchematic('angular-json', options);
    expect(getFileContent(tree, configPath)).toContain(`"prefix": "${prefix}"`);
  });
});