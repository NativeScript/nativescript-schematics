import { UnitTestTree } from "@angular-devkit/schematics/testing";
import { HostTree } from "@angular-devkit/schematics";
import { virtualFs, Path } from "@angular-devkit/core";
import { createAppModule } from '@schematics/angular/utility/test';
import { schematicRunner } from "./utils";

export interface VirtualFile {
  path: string;
  content: string;
}

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
        `(export )?class ${moduleName}`
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

export function setupTestTreeWithBase(files: VirtualFile[]): UnitTestTree {
  const memoryFs = setupInMemoryBase(files);
  const host = new HostTree(memoryFs);
  const tree = new UnitTestTree(host);

  return tree;
}

function setupInMemoryBase(files: VirtualFile[]): virtualFs.SimpleMemoryHost {
  const memoryFs = new virtualFs.SimpleMemoryHost();
  files.forEach(file => {
    const path = file.path as Path;
    // The write method of memoryFs expects an ArrayBuffer.
    // However, when the read method is used to fetch the file from the FS
    // the returned value is not converted properly to string.
    // This is why we're using node Buffer to write the file in the memory FS.
    // const content = stringToArrayBuffer(file.content);
    const content = Buffer.from(file.content);

    (<any>memoryFs).write(path, content).subscribe();
  });

  return memoryFs;
}

function stringToArrayBuffer(text: string): ArrayBuffer {
  const stringLength = text.length;

  const byteLength = stringLength * 2; // 2 bytes for each character
  const arrayBuffer = new ArrayBuffer(byteLength);
  const bufferView = new Uint16Array(arrayBuffer);

  for (let i = 0; i < stringLength; i += 1) {
    bufferView[i] = text.charCodeAt(i);
  }

  return arrayBuffer;
}



// TESTING
export function createEmptyNsOnlyProject(projectName: string, extension: string = ''): UnitTestTree {
    let appTree = schematicRunner.runSchematic('angular-json', { name: projectName, sourceRoot: 'src' });
  
    appTree = <any>createAppModule(<any>appTree, `/src/app/app.module${extension}.ts`);
  
    appTree.create('/package.json', JSON.stringify({
      nativescript: { id: 'proj' },
      dependencies: {
        '@angular/core': '^6.1.0'
      },
      devDependencies: {
        '@angular/cli': '^6.2.0'
      },
    }));
  
    return appTree;
  }
  
  export function createEmptySharedProject(projectName: string, webExtension: string = '', nsExtension: string = '.tns'): UnitTestTree {
    let tree = createEmptyNsOnlyProject(projectName, nsExtension);
    const appTree = createAppModule(<any>tree, `/src/app/app.module${webExtension}.ts`);
  
    appTree.create('/nsconfig.json', JSON.stringify({
      'appResourcesPath': 'App_Resources',
      'appPath': 'src',
      'nsext': '.tns',
      'webext': '',
      'shared': true,
      'useLegacyWorkflow': false
    }));
  
    return <any>appTree;
  }
  
  
  export interface ProjectSetup {
    projectName: string;
    sourceDirectory: string;
    importPrefix: string;
  }
  
  export function setupConfigFiles(setup: ProjectSetup, additionalFiles: VirtualFile[] = []): UnitTestTree {
    const { baseConfigPath, baseConfigContent } = getBaseTypescriptConfig(setup);
    const { webConfigPath, webConfigContent } = getWebTypescriptConfig(setup);
    const { angularJsonPath, angularJsonContent } = getAngularProjectConfig(webConfigPath, setup.projectName);
  
    const files: VirtualFile[] = [
        {
            path: baseConfigPath,
            content: baseConfigContent
        },
        {
            path: webConfigPath,
            content: webConfigContent
        },
        {
            path: angularJsonPath,
            content: angularJsonContent
        },
        ...additionalFiles
    ];
  
    const virtualTree = setupTestTreeWithBase(files);
  
    return virtualTree;
  }
  
  function getBaseTypescriptConfig({ sourceDirectory, importPrefix }: ProjectSetup) {
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
  
  function getWebTypescriptConfig({ sourceDirectory, importPrefix }: ProjectSetup) {
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
  
