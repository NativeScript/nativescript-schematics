import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import * as path from 'path';

import { Schema as ApplicationOptions } from './schema';

describe('Application Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    path.join(__dirname, '../collection.json'),
  );
  const defaultOptions: ApplicationOptions = {
    name: 'foo',
    prefix: '',
    sourceDir: 'app',
    routing: false,
    style: 'css',
    minimal: false,
  };

  it('should create all files of an application', () => {
    const options = { ...defaultOptions };

    const tree = schematicRunner.runSchematic('application', options);
    const files = tree.files;
    expect(files.indexOf('/foo/.angular-cli.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/.gitignore')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/tsconfig.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/webpack.config.js')).toBeGreaterThanOrEqual(0);

    expect(files.indexOf('/foo/app/package.json')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/main.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/main.aot.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/app.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/app.module.ngfactory.d.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/app.component.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/app.css')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/vendor.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/vendor-platform.android.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/vendor-platform.ios.ts')).toBeGreaterThanOrEqual(0);
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

  it('should handle the minimal flag', () => {
    const options = { ...defaultOptions, minimal: true };
    const tree = schematicRunner.runSchematic('application', options);

    const files = tree.files;
    const appComponent = '/foo/app/app.component.ts';
    expect(files.indexOf(appComponent)).toBeGreaterThanOrEqual(0);
    expect(getFileContent(tree, appComponent))
      .toMatch(new RegExp('template: `\\s*`'));
    expect(getFileContent(tree, appComponent))
      .toMatch(new RegExp('AppComponent {\\s*}'));
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

    const appCss = '/foo/app/app.css';
    expect(getFileContent(tree, appCss))
      .not
      .toMatch(new RegExp('@import "~nativescript-theme-core/css/core.light.css";'));
  });

  it('should handle the routing flag', () => {
    const options = { ...defaultOptions, routing: true };
    const tree = schematicRunner.runSchematic('application', options);

    const appModule = '/foo/app/app.module.ts';
    expect(tree.exists(appModule)).toBeTruthy();
    expect(getFileContent(tree, appModule)).toMatch(new RegExp(
      '@NgModule\\(\\{\\s*' +
      'imports: \\[(\\s*|(\\s*\\.*),(\\s*))' +
      'AppRoutingModule'
    ));

    const appRoutingModule = '/foo/app/app-routing.module.ts';
    expect(tree.exists(appRoutingModule)).toBeTruthy();
  });
}); 
