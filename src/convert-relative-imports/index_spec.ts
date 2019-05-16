import { join } from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { HostTree, Tree } from '@angular-devkit/schematics';
import { getFileContent } from '@schematics/angular/utility/test';

import { Schema as ConvertRelativeImportsOptions } from './schema';
import { setupConfigFiles, ProjectSetup } from '../test-utils';

const sourceDirectory = 'src';
const importPrefix = '@src';
const defaultOptions: ConvertRelativeImportsOptions = {
  project: 'my-app'
};

const projSetup: ProjectSetup = {
  projectName: defaultOptions.project,
  sourceDirectory,
  importPrefix
}

const aboutModulePath = `${sourceDirectory}/about/about.module.ts`;
const relativeImportContent = `
  import { AboutComponent } from './about.component';
`;
const fixedImportContent = `
  import { AboutComponent } from '${importPrefix}/about/about.component';
`;

describe('Convert relative imports to mapped imports', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json')
  );

  it('should convert the relative imports in a newly generated file', () => {
    let appTree = setupConfigFiles(projSetup);

    appTree.create(aboutModulePath, relativeImportContent);
    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(fixedImportContent);
  });

  it('should convert the relative imports in a modified file', () => {
    const existingContent = `
      import { AboutComponent } from '${importPrefix}/about/about.component';
    `;
    const modifiedContent = `
      import { AboutComponent } from '${importPrefix}/about/about.component';
      import { AboutComponent } from './other-about.component';
    `;
    const expected = `
      import { AboutComponent } from '${importPrefix}/about/about.component';
      import { AboutComponent } from '${importPrefix}/about/other-about.component';
    `;

    let appTree = setupConfigFiles(projSetup, [{
      path: aboutModulePath,
      content: existingContent
    }]);

    appTree.overwrite(aboutModulePath, modifiedContent);
    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(expected);
  });

  it('should convert the relative imports in a created and then renamed file', () => {
    let appTree = setupConfigFiles(projSetup);

    const renamedFilePath = aboutModulePath.replace(".ts", ".tns.ts");

    appTree.create(aboutModulePath, relativeImportContent);
    appTree.rename(aboutModulePath, renamedFilePath);

    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);
    const actual = getFileContent(appTree, renamedFilePath);

    expect(actual).toEqual(fixedImportContent);
  });

  it('should not modify files that weren\'t modified', () => {
    let appTree = setupConfigFiles(projSetup, [{
      path: aboutModulePath,
      content: relativeImportContent
    }]);

    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(relativeImportContent);
  });

  it('should not modify files with extension other than .ts', () => {
    let appTree = setupConfigFiles(projSetup);

    const generatedFilePath = `${sourceDirectory}/about/about.module.tsx`;

    appTree.create(generatedFilePath, relativeImportContent);
    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);
    const actual = getFileContent(appTree, generatedFilePath);

    expect(actual).toEqual(relativeImportContent);
  });

  it('should not modify files specified as ignored in the invocation options', () => {
    let appTree = setupConfigFiles(projSetup);

    appTree.create(aboutModulePath, relativeImportContent);

    const options: ConvertRelativeImportsOptions = { ...defaultOptions, filesToIgnore: [aboutModulePath] };
    appTree = schematicRunner.runSchematic('convert-relative-imports', options, appTree);
    const actual = getFileContent(appTree, aboutModulePath);

    expect(actual).toEqual(relativeImportContent);
  });

  it('should not modify files that are deleted by previous rules', () => {
    let appTree = setupConfigFiles(projSetup, [{
      path: aboutModulePath,
      content: relativeImportContent
    }]);

    appTree.delete(aboutModulePath);
    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);

    expect(appTree.get(aboutModulePath)).toBeNull();
  });

  it('should not modify files that were created and then deleted by previous rules', () => {
    let appTree = setupConfigFiles(projSetup);

    appTree.create(aboutModulePath, relativeImportContent);
    appTree.delete(aboutModulePath);
    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);

    expect(appTree.get(aboutModulePath)).toBeNull();
  });

  it('should not modify files that were modified and then deleted by previous rules', () => {

    let appTree = setupConfigFiles(projSetup, [{
      path: aboutModulePath,
      content: relativeImportContent
    }]);

    appTree.overwrite(aboutModulePath, relativeImportContent + '\nconsole.log(\'modified\');\n');
    appTree.delete(aboutModulePath);
    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);

    expect(appTree.get(aboutModulePath)).toBeNull();
  });

});

