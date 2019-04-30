import { join } from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { HostTree, Tree } from '@angular-devkit/schematics';
import { getFileContent } from '@schematics/angular/utility/test';

import { Schema as ConvertRelativeImportsOptions } from './schema';

const sourceDirectory = 'src';
const importPrefix = '@src';
const defaultOptions: ConvertRelativeImportsOptions = {
  project: 'my-app'
};

fdescribe('Convert relative imports to mapped imports', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../collection.json')
  );

  let appTree: UnitTestTree;
  beforeEach(() => {
    appTree = new UnitTestTree(new HostTree());
    appTree = setupConfigFiles(appTree, defaultOptions.project);
  });

  it('should convert the relative imports in a newly generated file', () => {

    const generatedFilePath = `${sourceDirectory}/about/about.module.ts`;
    const generatedContent = `
      import { AboutComponent } from './about.component';
    `;
    const expected = `
      import { AboutComponent } from '${importPrefix}/about/about.component';
    `;

    appTree.create(generatedFilePath, generatedContent);
    appTree = schematicRunner.runSchematic('convert-relative-imports', defaultOptions, appTree);
    const actual = getFileContent(appTree, generatedFilePath);

    expect(actual).toEqual(expected);
  });

  it('should convert the relative imports in a modified file', () => {
    // appTree.overwrite('some-file', 'some-content');
    // appTree['set'] = 
    // appTree.files.push();
    // TODO
  });

  it('should not modify files with extension other than .ts', () => {
    // TODO
  });

  it('should not modify files specified as ignored in the invocation options', () => {
    // TODO
  });

  it('should not modify files that are deleted by previous rules', () => {
    // TODO
  });
});

function setupConfigFiles(tree: UnitTestTree, projectName: string): UnitTestTree {
  const { baseConfigPath, baseConfigContent } = getBaseTypescriptConfig();
  const { webConfigPath, webConfigContent } = getWebTypescriptConfig();
  const { angularJsonPath, angularJsonContent } = getAngularProjectConfig(webConfigPath, projectName);

  tree.create(baseConfigPath, baseConfigContent);
  tree.create(webConfigPath, webConfigContent);
  tree.create(angularJsonPath, angularJsonContent);

  return tree;
}

function getBaseTypescriptConfig() {
  const baseConfigPath = 'tsconfig.json';
  const baseConfigObject = {
    compileOnSave: false,
    compilerOptions: {
      outDir: './dist/out-tsc',
      declaration: false,
      moduleResolution: 'node',
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      target: 'es5',
      typeRoots: [
        'node_modules/@types'
      ],
      lib: [
        'es2017',
        'dom',
        'es6',
        'es2015.iterable'
      ],
      baseUrl: '.',
      paths: {
        '~/*': [
          `${sourceDirectory}/`
        ]
      }
    }
  };
  const baseImportRemapKey = `${importPrefix}/*`;
  const baseImportMap = [
    `${sourceDirectory}/*.android.ts`,
    `${sourceDirectory}/*.ios.ts`,
    `${sourceDirectory}/*.tns.ts`,
    `${sourceDirectory}/*.web.ts`,
    `${sourceDirectory}/`
  ];
  baseConfigObject.compilerOptions.paths[baseImportRemapKey] = baseImportMap;
  const baseConfigContent = JSON.stringify(baseConfigObject);

  return { baseConfigPath, baseConfigContent };
}

function getWebTypescriptConfig() {
  const webConfigPath = `${sourceDirectory}/tsconfig.app.json`;
  const webImportRemapKey = `${importPrefix}/*`;
  const webImportMap = [
    `${sourceDirectory}/*.web.ts`,
    `${sourceDirectory}/`
  ];
  const webConfigObject = {
    'extends': '../tsconfig.json',
    compilerOptions: {
      outDir: './out-tsc/app',
      'module': 'es2015',
      types: [],
      paths: {}
    }
  };
  webConfigObject.compilerOptions.paths[webImportRemapKey] = webImportMap;
  const webConfigContent = JSON.stringify(webConfigObject);

  return { webConfigPath, webConfigContent };
}

function getAngularProjectConfig(webConfigPath: string, projectName: string) {
  const angularJsonPath = 'angular.json';

  const angularJsonObject = {
    defaultProject: projectName,
    projects: {}
  };

  angularJsonObject.projects[projectName] = {
    projectType: 'application',
    architect: {
      build: {
        options: {
          tsConfig: webConfigPath
        }
      }
    }
  };

  const angularJsonContent = JSON.stringify(angularJsonObject);

  return { angularJsonPath, angularJsonContent };
}
