import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import * as path from 'path';

import { Schema as NgCliConfigOptions } from './schema';

describe('Ng CLI Config Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    path.join(__dirname, '../collection.json'),
  );
  const appPath = 'foo';
  const defaultOptions: NgCliConfigOptions = {
    path: appPath,
    sourceDir: 'app',
    style: 'css',
    prefix: 'app',
  };
  const configPath = `/${appPath}/.angular-cli.json`;

  it('should create all files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('ng-cli-config', options);
    const files = tree.files;
    expect(files.indexOf(configPath)).toBeGreaterThanOrEqual(0);
  }); 

  it('should respect the style extension option', () => {
    const style = 'scss';
    const options = { ...defaultOptions, style };

    const tree = schematicRunner.runSchematic('ng-cli-config', options);
    expect(getFileContent(tree, configPath)).toContain(`"styleExt": "${style}"`);
  });

  it('should respect the source directory option', () => {
    const sourceDir = 'src/app';
    const options = { ...defaultOptions, sourceDir };

    const tree = schematicRunner.runSchematic('ng-cli-config', options);
    expect(getFileContent(tree, configPath)).toContain(`"root": "${sourceDir}"`);
  });

  it('should respect the prefix option', () => {
    const prefix = 'my-app-prefix';
    const options = { ...defaultOptions, prefix };

    const tree = schematicRunner.runSchematic('ng-cli-config', options);
    expect(getFileContent(tree, configPath)).toContain(`"prefix": "${prefix}"`);
  });
});