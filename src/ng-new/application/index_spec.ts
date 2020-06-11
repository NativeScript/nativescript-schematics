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

  it('should create all files of an application', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('application', options).toPromise();
    const files = tree.files;
    expect(files).toContain('/foo/angular.json');
    expect(files).toContain('/foo/nsconfig.json');
    expect(files).toContain('/foo/.gitignore');
    expect(files).toContain('/foo/package.json');
    expect(files).toContain('/foo/tsconfig.json');
    expect(files).toContain('/foo/app/app.css');

    expect(files).toContain('/foo/app/package.json');
    expect(files).toContain('/foo/app/main.ts');
    expect(files).toContain('/foo/app/app.module.ts');
    expect(files).toContain('/foo/app/app.component.ts');

    expect(files).toContain('/foo/app/home/home.component.ts');
    expect(files).toContain('/foo/app/home/home.component.html');
    expect(files).toContain('/foo/app/home/home.component.css');
  });

  it('should create root NgModule with bootstrap information', async () => {
    const options = { ...defaultOptions };
    const tree = await schematicRunner.runSchematicAsync('application', options).toPromise();
    const content = getFileContent(tree, '/foo/app/app.module.ts');

    expect(content).toMatch(isInModuleMetadata('AppModule', 'bootstrap', 'AppComponent', true));
    expect(content).toMatch(isInModuleMetadata('AppModule', 'declarations', 'AppComponent', true));
    expect(content).toMatch(isInModuleMetadata('AppModule', 'imports', 'NativeScriptModule', true));

    expect(content).toMatch('import { NativeScriptModule } from \'@nativescript/angular\'');
    expect(content).toMatch('import { AppComponent } from \'./app.component\'');
  });

  it('should handle a different sourceDir', () => {
    const options = { ...defaultOptions, sourceDir: 'some/custom/path' };

    let tree: UnitTestTree | null = null;
    expect(() => tree = schematicRunner
      .runSchematic('application', options))
      .not.toThrow();

    if (tree) {
      const files = tree!.files;
      expect(files).toContain('/foo/tsconfig.json');
      expect(files).toContain('/foo/some/custom/path/app.module.ts');
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
      .toMatch(new RegExp('@ngtools/webpack'));

    const files = tree!.files;
    expect(files).not.toContain('/foo/webpack.config.js');
  });

  it('should generate correct files when different style extension is specified', () => {
    const options = { ...defaultOptions, style: 'scss' };
    const tree = schematicRunner.runSchematic('application', options);

    const files = tree!.files;

    expect(files).not.toContain('/foo/app/app.css');
    expect(files).toContain('/foo/app/app.android.scss');
    expect(files).toContain('/foo/app/app.ios.scss');

    expect(files).not.toContain('/foo/app/home/home.component.css');
    expect(files).toContain('/foo/app/home/home.component.scss');
  });
});
