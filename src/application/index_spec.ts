import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import * as path from 'path';

import { Schema as ApplicationOptions } from './schema';
import { isInModuleMetadata } from '../test-utils';

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
    expect(files.indexOf('/foo/app/vendor.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/vendor-platform.android.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/vendor-platform.ios.ts')).toBeGreaterThanOrEqual(0);
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
  });

  it('should handle the routing flag', () => {
    const options = { ...defaultOptions, routing: true };
    const tree = schematicRunner.runSchematic('application', options);

    const appModulePath = '/foo/app/app.module.ts';
    expect(tree.exists(appModulePath)).toBeTruthy();
    const appModuleContent = getFileContent(tree, appModulePath);
    expect(appModuleContent).toMatch(
      isInModuleMetadata('AppModule', 'imports', 'AppRoutingModule', true)
    );

    const files = tree.files;
    expect(files.indexOf('/foo/app/app-routing.module.ts')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/item/item-detail.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/item/item-detail.component.ts')).toBeGreaterThanOrEqual(0);

    expect(files.indexOf('/foo/app/item/items.component.html')).toBeGreaterThanOrEqual(0);
    expect(files.indexOf('/foo/app/item/items.component.ts')).toBeGreaterThanOrEqual(0);

    expect(files.indexOf('/foo/app/item/item.ts')).toBeGreaterThanOrEqual(0);
  });
}); 
