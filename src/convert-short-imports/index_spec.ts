import { join } from 'path';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';

import { Schema as ConvertShortImportsOptions } from './schema';
import { createTestProject, TestProjectSetup } from '../test-utils';

const srcPath = 'src';
const defaultOptions: ConvertShortImportsOptions = {
  project: 'my-app',
  srcPath,
};

const projSetup: TestProjectSetup = {
  projectName: defaultOptions.project,
  sourceDirectory: srcPath,
};

const aboutModulePath = `${srcPath}/about/about.module.ts`;
const shortImportContent = `
  import { SearchBar } from 'ui/search-bar';
`;
const fixedImportContent = `
  import { SearchBar } from 'tns-core-modules/ui/search-bar';
`;

describe('Convert short imports to full imports with "tns-core-modules" prefix', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json'),
  );

  it('should convert the short imports in a newly generated file', async () => {
    let appTree = createTestProject(projSetup);

    appTree.create(aboutModulePath, shortImportContent);
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(fixedImportContent);
  });

  it('should convert the short imports in a modified file', async () => {
    const existingContent = `placeholder`;
    const modifiedContent = `
      import { SearchBar } from 'ui/search-bar';
    `;
    const expected = `
      import { SearchBar } from 'tns-core-modules/ui/search-bar';
    `;

    let appTree = createTestProject(projSetup, [{
      path: aboutModulePath,
      content: existingContent,
    }]);

    appTree.overwrite(aboutModulePath, modifiedContent);
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(expected);
  });

  it('should convert the short imports in a created and then renamed file', async () => {
    let appTree = createTestProject(projSetup);

    const renamedFilePath = aboutModulePath.replace('.ts', '.tns.ts');

    appTree.create(aboutModulePath, shortImportContent);
    appTree.rename(aboutModulePath, renamedFilePath);

    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();
    const actual = getFileContent(appTree, renamedFilePath);

    expect(actual).toEqual(fixedImportContent);
  });

  it('should modify files that weren\'t modified', async () => {
    let appTree = createTestProject(projSetup, [{
      path: aboutModulePath,
      content: shortImportContent,
    }]);

    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(fixedImportContent);
  });

  it('should modify files with .js extension', async () => {
    let appTree = createTestProject(projSetup);

    const generatedFilePath = `${srcPath}/about/about.component.js`;
    const shortRequireContent = 'const SearchBar = require("ui/search-bar").SearchBar';
    const fixedContent = 'const SearchBar = require("tns-core-modules/ui/search-bar").SearchBar';

    appTree.create(generatedFilePath, shortRequireContent);
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();
    const actual = getFileContent(appTree, generatedFilePath);

    expect(actual).toEqual(fixedContent);
  });

  it('should not modify files with extension other than .ts and .js', async () => {
    let appTree = createTestProject(projSetup);

    const generatedFilePath = `${srcPath}/about/about.component.tsx`;

    appTree.create(generatedFilePath, shortImportContent);
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();
    const actual = getFileContent(appTree, generatedFilePath);

    expect(actual).toEqual(shortImportContent);
  });

  it('should not modify files specified as ignored in the invocation options', async () => {
    let appTree = createTestProject(projSetup);

    appTree.create(aboutModulePath, shortImportContent);

    const options: ConvertShortImportsOptions = { ...defaultOptions, filesToIgnore: [aboutModulePath] };
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', options, appTree).toPromise();
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(shortImportContent);
  });

  it('should not modify files that are deleted by previous rules', async () => {
    let appTree = createTestProject(projSetup, [{
      path: aboutModulePath,
      content: shortImportContent,
    }]);

    appTree.delete(aboutModulePath);
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();

    expect(appTree.get(aboutModulePath)).toBeNull();
  });

  it('should not modify files that were created and then deleted by previous rules', async () => {
    let appTree = createTestProject(projSetup);

    appTree.create(aboutModulePath, shortImportContent);
    appTree.delete(aboutModulePath);
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();

    expect(appTree.get(aboutModulePath)).toBeNull();
  });

  it('should not modify files that were modified and then deleted by previous rules', async () => {

    let appTree = createTestProject(projSetup, [{
      path: aboutModulePath,
      content: shortImportContent,
    }]);

    appTree.overwrite(aboutModulePath, shortImportContent + '\nconsole.log(\'modified\');\n');
    appTree.delete(aboutModulePath);
    appTree = await schematicRunner.runSchematicAsync('convert-short-imports', defaultOptions, appTree).toPromise();

    expect(appTree.get(aboutModulePath)).toBeNull();
  });
});
