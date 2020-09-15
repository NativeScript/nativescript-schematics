import * as ts from 'typescript';
import { basename } from 'path';
import { Tree, SchematicsException } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/config';
import {
  findBootstrapModuleCall,
  findBootstrapModulePath,
} from '@schematics/angular/utility/ng-ast-utils';

import { safeGet } from './utils';
import { findNode, findImportPath, getSourceFile } from './ts-utils';

export interface AngularProjectSettings {
  /** default: '' */
  root: string;

  /** default: 'src' */
  sourceRoot: string;

  /** default: 'main' */
  mainName: string;
  /** default: 'src/main.ts' */
  mainPath: string;
  /** default: 'app' */
  prefix: string;
  /** default: 'src/tsconfig.json' */
  tsConfig: string;

  /** default: 'AppModule' */
  entryModuleClassName: string;
  /** default: 'App' */
  entryModuleName: string;
  /** default: 'src/app/app.module.ts' */
  entryModulePath: string;
  /** default: './app/app.module' */
  entryModuleImportPath: string;

  /** default: 'AppComponent' */
  entryComponentClassName: string;
  /** default: 'App' */
  entryComponentName: string;
  /** default: 'src/app/app.component.ts' */
  entryComponentPath: string;
  /** default: './app.component' */
  entryComponentImportPath: string;

  /** default: 'app-root' */
  indexAppRootTag: string;

  /** Typescript resolver for this project */
  tsResolver: TypescriptResolver;
}

export interface CoreProjectSettings {
  root: string;
  sourceRoot: string;
  mainName: string;
  mainPath: string;
  prefix: string;
  tsConfig: string;
}

/**
 * Metadata for a component or module class
 */
export interface ClassMetadata {
  /**
   * Full Class name
   * For Example: 'HomeComponent'
   */
  className: string;

  /**
   * The name of the class without the Class
   * For Example: 'Home'
   */
  name: string;

  /**
   * Relative import path:
   * For Example: './home/home.component'
   */
  importPath: string;

  /**
   * Full path to the file:
   * For Example: 'src/home/home.component.ts
   */
  path: string;
}

type TypescriptResolver = (moduleName: string, containingFilePath: string) => string;

export function getAngularProjectSettings(tree: Tree, projectName: string): AngularProjectSettings {
  const projectSettings = getCoreProjectSettings(tree, projectName);

  const tsResolver = getTypescriptResolver(tree, projectSettings.tsConfig);
  const entryModule = getEntryModuleMetadata(tree, projectSettings.mainPath, tsResolver);
  const entryComponent = getEntryComponentMetadata(tree, entryModule.path, tsResolver);
  const indexAppRootTag = getAppRootTag(tree, entryComponent.path);

  return {
    ...projectSettings,

    entryModuleClassName: entryModule.className,
    entryModuleImportPath: entryModule.importPath,
    entryModuleName: entryModule.name,
    entryModulePath: entryModule.path,

    entryComponentClassName: entryComponent.className,
    entryComponentImportPath: entryComponent.importPath,
    entryComponentName: entryComponent.name,
    entryComponentPath: entryComponent.path,

    indexAppRootTag,

    tsResolver,
  };
}

function getCoreProjectSettings(tree: Tree, projectName: string): CoreProjectSettings {
  const { targets, project } = parseAngularConfig(tree, projectName);
  if (!targets) {
    throw new SchematicsException(
      `Failed to find build targets for project ${projectName}!`,
    );
  }

  const buildTarget = targets.build;
  if (!buildTarget) {
    throw new SchematicsException(
      `Failed to find build target for project ${projectName}!`,
    );
  }

  const root = project.root;
  const sourceRoot = project.sourceRoot || 'src';
  const mainPath = safeGet(buildTarget, 'options', 'main');
  const mainName = mainPath && basename(mainPath).replace(/\.ts$/, '');
  const prefix = project.prefix;
  const tsConfig = safeGet(buildTarget, 'options', 'tsConfig');

  return {
    root,
    sourceRoot,
    mainName,
    mainPath,
    prefix,
    tsConfig,
  };
}

export function getTsConfigFromProject(tree: Tree, projectName: string): string {
  const { targets } = parseAngularConfig(tree, projectName);
  const tsConfig = safeGet(targets, 'build', 'options', 'tsConfig');

  return tsConfig;
}

function parseAngularConfig(tree, projectName: string) {
  const project = getProjectObject(tree, projectName);
  const targets = project.architect;

  return { targets, project };
}

export function getProjectObject(tree: Tree, projectName: string) {
  const workspace = getWorkspace(tree);
  const project = workspace.projects[projectName];
  if (!project) {
    throw new SchematicsException(`Couldn't find project "${projectName}" in the workspace!`);
  }

  return project;
}

function getEntryModuleMetadata(tree: Tree, mainPath: string, tsResolver: TypescriptResolver): ClassMetadata {
  const bootstrapCall = findBootstrapModuleCall(tree, mainPath);
  if (!bootstrapCall) {
    throw new SchematicsException('Bootstrap call not found! Cannot build project data!');
  }
  const className = bootstrapCall.arguments[0].getText();
  const name = className.replace(/Module$/, '');

  const importPath = findBootstrapModulePath(tree, mainPath);

  const path = tsResolver(importPath, mainPath);

  const metadata = {
    className,
    name,
    importPath,
    path,
  };

  return metadata;
}

// Step 3 - get appComponent and appComponentPath => open ${appRoot}/${entryModulePath}
// - get appComponent from bootstrap: [ __value__ ]
// - get appComponentPath from import { ${appComponent} } from '__value__'
function getEntryComponentMetadata(tree: Tree, entryModulePath: string, tsResolver: TypescriptResolver): ClassMetadata {
  const source = getSourceFile(tree, entryModulePath);

  // find -> bootstrap -> array -> array value
  // bootstrap: [
  //   AppComponent  <- end result
  // ],
  const node = findNode<ts.ArrayLiteralExpression>(source, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'bootstrap' },
    { kind: ts.SyntaxKind.ArrayLiteralExpression },
  ]);

  const className = node.elements[0].getText();

  const name = className.replace('Component', '');

  const importPath = findImportPath(source, className);

  const path = tsResolver(importPath, entryModulePath);

  return {
    className,
    name,
    importPath,
    path,
  };
}

// Step 4 - get indexAppRootTag => open ${appRoot}/${appComponentPath} - get from selector: '__value__'
function getAppRootTag(tree: Tree, entryComponentPath: string): string {
  const source = getSourceFile(tree, entryComponentPath);

  const node = findNode<ts.StringLiteral>(source, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'selector' },
    { kind: ts.SyntaxKind.StringLiteral },
  ]);

  const indexAppRootTag = node.text;

  return indexAppRootTag;
}

function getTypescriptResolver(tree: Tree, tsConfigName: string): TypescriptResolver {
  const parseConfigFileHost = createParseConfigFileHost(tree);

  const tsConfig = ts.getParsedCommandLineOfConfigFile(
    tsConfigName,
    ts.getDefaultCompilerOptions(),
    parseConfigFileHost,
  );

  if (!tsConfig) {
    throw new SchematicsException(`Could not load tsconfig file: ${tsConfigName}`);
  }
  const compilerOptions = tsConfig.options;
  const moduleResolutionHost: ts.ModuleResolutionHost = {
    fileExists: parseConfigFileHost.fileExists,
    readFile: parseConfigFileHost.readFile,
  };

  return (moduleName: string, containingFilePath: string): string => {
    const resolutionResult = ts.resolveModuleName(
      moduleName,
      containingFilePath,
      compilerOptions,
      moduleResolutionHost,
    );

    if (resolutionResult.resolvedModule) {
      return resolutionResult.resolvedModule.resolvedFileName;
    } else {
      throw new SchematicsException(`Could not resolve ${moduleName} using config: ${tsConfigName}`);
    }
  };
}

function createParseConfigFileHost(tree): ts.ParseConfigFileHost {
  const readFile = (filePath: string): string | undefined => {
    const mainBuffer = tree.read(filePath);
    if (!mainBuffer) {
      throw new SchematicsException(`Main file (${filePath}) not found`);
    }

    return mainBuffer.toString('utf-8');
  };

  const fileExists = (filePath: string): boolean => {
    return tree.exists(filePath);
  };

  // NOTE: readDirectory is called when there are include/exclude options in the tsconfig.
  // We don't need these for resolving so (hopefully) it's OK to just return []
  const readDirectory = (
    path: string,
    extensions?: ReadonlyArray<string>,
    exclude?: ReadonlyArray<string>,
    include?: ReadonlyArray<string>,
    depth?: number,
  ): Array<string> => {
    return [];
  };
  const parseConfigFileHost: ts.ParseConfigFileHost = {
    getCurrentDirectory: () => '/',
    useCaseSensitiveFileNames: false,
    readDirectory,
    fileExists,
    readFile,
    onUnRecoverableConfigFileDiagnostic: () => Object,
  };

  return parseConfigFileHost;
}
