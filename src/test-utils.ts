import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { HostTree, FileEntry } from '@angular-devkit/schematics';
import { virtualFs, Path } from '@angular-devkit/core';
import { createAppModule } from '@schematics/angular/utility/test';

export interface VirtualFile {
  path: string;
  content: string;
}

export interface TestProjectSetup {
  projectName: string;
  sourceDirectory?: string;
  importPrefix?: string;
  webExtension?: string;
  nsExtension?: string;
  shared?: boolean;
}

const defaultProjectSettings: TestProjectSetup = {
  projectName: 'my-project',
  sourceDirectory: 'src',
  importPrefix: '@src',
  webExtension: '',
  nsExtension: '.tns',
  shared: true,
};

export const isInModuleMetadata = (
  moduleName: string,
  property: string,
  value: string,
  inArray: boolean,
) =>
  isInDecoratorMetadata(moduleName, property, value, 'NgModule', inArray);

export const isInComponentMetadata = (
  componentName: string,
  property: string,
  value: string,
  inArray: boolean,
) =>
  isInDecoratorMetadata(componentName, property, value, 'Component', inArray);

export const isInDecoratorMetadata = (
  moduleName: string,
  property: string,
  value: string,
  decoratorName: string,
  inArray: boolean,
) =>
  new RegExp(
    `@${decoratorName}\\(\\{([^}]*)` +
    objectContaining(property, value, inArray) +
    '[^}]*\\}\\)' +
    '\\s*' +
    `(export )?class ${moduleName}`,
  );

const objectContaining = (
  property: string,
  value: string,
  inArray: boolean,
) =>
  inArray ?
    keyValueInArray(property, value) :
    keyValueString(property, value);

const keyValueInArray = (
  property: string,
  value: string,
) =>
  `${property}: \\[` +
  nonLastValueInArrayMatcher +
  `${value},?` +
  nonLastValueInArrayMatcher +
  lastValueInArrayMatcher +
  `\\s*]`;

const nonLastValueInArrayMatcher = `(\\s*|(\\s*(\\w+,)*)\\s*)*`;
const lastValueInArrayMatcher = `(\\s*|(\\s*(\\w+)*)\\s*)?`;

const keyValueString = (
  property: string,
  value: string,
) => `${property}: ${value}`;

function setupTestTree(files: Array<VirtualFile>): UnitTestTree {
  const memoryFs = new virtualFs.SimpleMemoryHost();

  files.forEach((file) => {
    const path = file.path as Path;
    // The write method of memoryFs expects an ArrayBuffer.
    // However, when the read method is used to fetch the file from the FS
    // the returned value is not converted properly to string.
    // This is why we're using node Buffer to write the file in the memory FS.
    // const content = stringToArrayBuffer(file.content);
    const content = Buffer.from(file.content);

    memoryFs.write(path, <any>content).subscribe();
  });

  const host = new HostTree(memoryFs);
  const tree = new UnitTestTree(host);

  return tree;
}

export function createEmptyNsOnlyProject(
  projectName: string,
  nsExtension: string = '',
): UnitTestTree {
  const setup = { ...defaultProjectSettings, projectName, nsExtension };
  const additionalFiles = [
    getNsConfig(setup),
    getNsPackageJson(setup),
    getNsEntryPoint(setup),
  ];

  return createTestProject(setup, additionalFiles);
}

export function createEmptySharedProject(
  projectName: string,
  webExtension: string = '',
  nsExtension: string = '.tns',
): UnitTestTree {
  const setup = { ...defaultProjectSettings, projectName, webExtension, nsExtension };
  const additionalFiles = [
    getNsConfig(setup),
    getNsEntryPoint(setup, nsExtension),
    getAppModule(setup.webExtension),
  ];

  return createTestProject(setup, additionalFiles);
}

export function createTestProject(setup: TestProjectSetup, additionalFiles: Array<VirtualFile> = []): UnitTestTree {
  setup = {...defaultProjectSettings, ...setup};
  const files: Array<VirtualFile> = [];
  files.push(getBaseTypescriptConfig(setup));

  const { path: webConfigPath, content: webConfigContent } = getWebTypescriptConfig(setup);
  files.push({ path: webConfigPath, content: webConfigContent });
  files.push(getAngularProjectConfig(webConfigPath, setup));
  files.push(getPackageJson(setup));

  files.push(getAppModule(setup.nsExtension));

  files.push(...additionalFiles);

  const virtualTree = setupTestTree(files);

  return virtualTree;
}

function getPackageJson(setup: TestProjectSetup): VirtualFile {
  return {
    path: '/package.json',
    content: JSON.stringify({
      nativescript: { id: setup.projectName },
      dependencies: {
        '@angular/core': '^9.1.0',
      },
      devDependencies: {
        '@angular/cli': '^9.1.0',
      },
    }),
  };
}

function getNsConfig(setup: TestProjectSetup): VirtualFile {
  return {
    path: '/nativescript.config.ts',
    content: `import { NativeScriptConfig } from '@nativescript/core';

    export default {
      id: 'org.nativescript.plugindemo',
      appResourcesPath: 'App_Resources',
      android: {
        v8Flags: '--expose_gc',
        markingMode: 'none',
      },
      appPath: '${setup.sourceDirectory}',
    } as NativeScriptConfig;
    `,
    // JSON.stringify({
    //   appResourcesPath: 'App_Resources',
    //   appPath: setup.sourceDirectory,
    //   nsext: setup.nsExtension,
    //   webext: setup.webExtension,
    //   shared: true
    // }),
  };
}

function getBaseTypescriptConfig({ sourceDirectory, importPrefix }: TestProjectSetup): VirtualFile {
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
        'node_modules/@types',
      ],
      lib: [
        'es2017',
        'dom',
        'es6',
        'es2015.iterable',
      ],
      baseUrl: '.',
      paths: {
        '~/*': [
          `${sourceDirectory}/`,
        ],
      },
    },
  };
  const baseImportRemapKey = `${importPrefix}/*`;
  const baseImportMap = [
    `${sourceDirectory}/*.android.ts`,
    `${sourceDirectory}/*.ios.ts`,
    `${sourceDirectory}/*.tns.ts`,
    `${sourceDirectory}/*.web.ts`,
    `${sourceDirectory}/`,
  ];
  baseConfigObject.compilerOptions.paths[baseImportRemapKey] = baseImportMap;
  const baseConfigContent = JSON.stringify(baseConfigObject);

  return { path: baseConfigPath, content: baseConfigContent };
}

function getWebTypescriptConfig({ sourceDirectory, importPrefix }: TestProjectSetup): VirtualFile {
  const webConfigPath = 'tsconfig.app.json';
  const webImportRemapKey = `${importPrefix}/*`;
  const webImportMap = [
    `${sourceDirectory}/*.web`,
    `${sourceDirectory}/`,
  ];
  const webConfigObject = {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: './out-tsc/app',
      module: 'es2015',
      types: [],
      paths: {},
    },
  };
  webConfigObject.compilerOptions.paths[webImportRemapKey] = webImportMap;
  const webConfigContent = JSON.stringify(webConfigObject);

  return { path: webConfigPath, content: webConfigContent };
}

function getAngularProjectConfig(webConfigPath: string, setup: TestProjectSetup): VirtualFile {
  const angularJsonPath = 'angular.json';

  const architect = {
    build: {
      options: {
        tsConfig: webConfigPath,
      },
    },
  };

  const angularJsonObject = {
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    defaultProject: setup.projectName,
    projects: {
      [setup.projectName]: {
        projectType: 'application',
        sourceRoot: setup.sourceDirectory,
        prefix: 'app',
        architect: setup.shared ? architect : undefined,
      },
    },
  };

  const angularJsonContent = JSON.stringify(angularJsonObject);

  return { path: angularJsonPath, content: angularJsonContent };
}

function getAppModule(extension?: string): VirtualFile {
  const path = `/src/app/app.module${extension}.ts`;

  // Ugly ... but we need a tree to call createAppModule()
  const tree = new UnitTestTree(new HostTree(new virtualFs.SimpleMemoryHost()));
  createAppModule(tree, path);

  const file = <FileEntry>tree.get(path);

  return {
    path,
    content: file.content.toString(),
  };
}

function getNsEntryPoint(setup: TestProjectSetup, extension = ''): VirtualFile {
  return {
    path: `${setup.sourceDirectory}/main${extension}.ts`,
    content: `
      import { platformNativeScriptDynamic } from '@nativescript/angular';
      import { AppModule } from './app/app.module';

      platformNativeScriptDynamic().bootstrapModule(AppModule);
    `,
  };
}

function getNsPackageJson(setup: TestProjectSetup): VirtualFile {
  return {
    path: `${setup.sourceDirectory}/package.json`,
    content: JSON.stringify({
      android: {
        v8Flags: '--expose_gc',
      },
      main: 'main.js',
    }),
  };
}
