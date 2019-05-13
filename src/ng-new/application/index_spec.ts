import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import * as path from 'path';

import { Schema as ApplicationOptions } from './schema';
import { isInModuleMetadata } from '../../test-utils';

describe('Application Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    path.join(__dirname, '../../collection.json'),
  );
  const defaultOptions: ApplicationOptions = {
    name: 'foo',
    prefix: '',
    sourceDir: 'app',
    style: 'css',
    theme: true,
    webpack: true,
  };

  it('should create all files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('application', options);
    const files = tree.files;
    expect(files.indexOf('/foo/angular.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/nsconfig.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/.gitignore')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/tsconfig.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/app.css')).toBeGreaterThanOrEqual(0);

    expect(files.indexOf('/foo/app/package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/main.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/app.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/app.component.ts')).toBeGreaterThanOrEqual(0);

    expect(files.indexOf('/foo/app/home/home.component.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/home/home.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/home/home.component.css')).toBeGreaterThanOrEqual(0);
  });

  it('should create root NgModule with bootstrap information', () => {
    const options = { ...defaultOptions };
    const tree = schematicRunner.runSchematic('application', options);
    const content = getFileContent(tree, '/foo/app/app.module.ts');

    expect(content).toMatch(isInModuleMetadata('AppModule', 'bootstrap', 'AppComponent', true));
    expect(content).toMatch(isInModuleMetadata('AppModule', 'declarations', 'AppComponent', true));
    expect(content).toMatch(isInModuleMetadata('AppModule', 'imports', 'NativeScriptModule', true));

    expect(content).toMatch('import { NativeScriptModule } from \'nativescript-angular/nativescript.module\'');
    expect(content).toMatch('import { AppComponent } from \'./app.component\'');
  });

  it('should handle a different sourceDir', () => {
    const options = { ...defaultOptions, sourceDir: 'some/custom/path' };

    let tree: UnitTestTree | null = null;
    expect(() => tree = schematicRunner
      .runSchematic('application', options))
      .not.toThrow();

    if (tree) {
      const files = tree! .files;
      expect(files.indexOf('/foo/tsconfig.json')).toBeGreaterThanOrEqual(0);
      expect(files.indexOf('/foo/some/custom/path/app.module.ts')).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle the theme flag', () => {
    const options = { ...defaultOptions, theme: false };
    const tree = schematicRunner.runSchematic('application', options);

    const appComponent = '/foo/app/app.component.ts';
    expect(getFileContent(tree, appComponent))
      .not
      .toMatch(new RegExp('class="h1 text-center"'));

     expect(getFileContent(tree, appComponent))
      .not
      .toMatch(new RegExp('class="btn btn-primary btn-active"'));

     expect(getFileContent(tree, appComponent))
      .not
      .toMatch(new RegExp('class="h2 text-center"'));
  });

  it('should handle the webpack flag', () => {
    const options = { ...defaultOptions, webpack: false };
    const tree = schematicRunner.runSchematic('application', options);

    const packageJson = '/foo/package.json';
    expect(getFileContent(tree, packageJson))
      .not
      .toMatch(new RegExp('nativescript-dev-webpack'));

      const files = tree! .files;
      expect(files.indexOf('/foo/webpack.config.js')).toEqual(-1);
  });

  it('should generate correct files when different style extension is specified', () => {
    const options = { ...defaultOptions, style: 'scss' };
    const tree = schematicRunner.runSchematic('application', options);

    const files = tree! .files;

    expect(files.indexOf('/foo/app/app.css')).toEqual(-1);
    expect(files.indexOf('/foo/app/app.android.scss')).toBeGreaterThan(-1);
    expect(files.indexOf('/foo/app/app.ios.scss')).toBeGreaterThan(-1);

    expect(files.indexOf('/foo/app/home/home.component.css')).toEqual(-1);
    expect(files.indexOf('/foo/app/home/home.component.scss')).toBeGreaterThan(-1);
  });
}); 
