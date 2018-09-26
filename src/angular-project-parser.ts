import * as ts from 'typescript';
import { join, dirname, basename } from 'path';
import { Tree, SchematicsException } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/config';
import { getProjectTargets } from '@schematics/angular/utility/project-targets';
import {
  getAppModulePath,
  findBootstrapModuleCall,
  findBootstrapModulePath,
} from '@schematics/angular/utility/ng-ast-utils';

import { getSourceFile, safeGet } from './utils';
import { findNode, findImportPath } from './ast-utils';

export interface AngularProjectSettings {
  /** default: '' */
  root: string;

  /** default: 'src' */
  sourceRoot: string;
  
  /** default: 'main'*/
  mainName: string;
  /** default: 'src/main.ts'*/
  mainPath: string;
  /** default: 'app' */
  prefix: string;
  /** default: 'src/tsconfig.json' */
  tsConfig: string;

  /** default: 'AppModule'*/
  entryModuleClassName: string;
  /** default: 'App'*/
  entryModuleName: string;
  /** default: 'src/app/app.module.ts'*/
  entryModulePath: string;
  /** default: './app/app.module'*/
  entryModuleImportPath: string;

  /** default: 'AppComponent' */
  entryComponentClassName: string;
  /** default: 'App' */
  entryComponentName: string;
  /** default: 'src/app/app.component.ts' */
  entryComponentPath: string;
  /** default: './app.component' */
  entryComponentImportPath: string;

  /** default: 'app-root'*/
  indexAppRootTag: string;
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
  className: string,

  /** The name of the class without the Class
   * For Example: 'Home'
   */
  name: string,

  /**
   * Relative import path:
   * For Example: './home/home.component'
   */
  importPath: string,

  /**
   * Full path to the file:
   * For Example: 'src/home/home.component.ts
   */
  path: string
}

export function getAngularProjectSettings(tree: Tree, projectName: string): AngularProjectSettings {
  const projectSettings = getCoreProjectSettings(tree, projectName);
  const entryModule = getEntryModuleMetadata(tree, projectSettings.mainPath);

  const entryComponent = getEntryComponentMetadata(tree, entryModule.path);
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

    indexAppRootTag
  };
}

function getCoreProjectSettings(tree: Tree, projectName: string): CoreProjectSettings {
  const project = getProjectObject(tree, projectName);
  const targets = getProjectTargets(project);
  if (!targets) {
    throw new SchematicsException(
      `Failed to find build targets for project ${projectName}!`
    );
  }

  const buildTarget = targets.build;
  if (!buildTarget) {
    throw new SchematicsException(
      `Failed to find build target for project ${projectName}!`
    );
  }

  const root = project.root;
  const sourceRoot = project.sourceRoot || 'src';
  const mainPath = safeGet(buildTarget, 'options', 'main');
  const mainName = basename(mainPath).replace(/\.ts$/, '');
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

function getProjectObject(tree: Tree, projectName: string) {
  const workspace = getWorkspace(tree);
  const project = workspace.projects[projectName];
  if (!project) {
    throw new SchematicsException(`Couldn't find project "${projectName}" in the workspace!`);
  }

  return project;
}

function getEntryModuleMetadata(tree: Tree, mainPath: string): ClassMetadata {
  const bootstrapCall = findBootstrapModuleCall(tree, mainPath);
  if (!bootstrapCall) {
      throw new SchematicsException('Bootstrap call not found! Cannot build project data!');
  }
  const className = bootstrapCall.arguments[0].getText();
  const name = className.replace(/Module$/, '');
  const importPath = findBootstrapModulePath(tree, mainPath);
  const path = getAppModulePath(tree, mainPath);

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
function getEntryComponentMetadata(tree: Tree, entryModulePath: string): ClassMetadata {
  const source = getSourceFile(tree, entryModulePath);
  
  // find -> bootstrap -> array -> array value
  // bootstrap: [
  //   AppComponent  <- end result
  // ],
  const node = findNode<ts.ArrayLiteralExpression>(source, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'bootstrap'},
    { kind: ts.SyntaxKind.ArrayLiteralExpression }
  ]);

  const className = node.elements[0].getText();

  const name = className.replace('Component', '');

  const importPath = findImportPath(source, className);

  const entryModuleDir = dirname(entryModulePath);
  const path = join(entryModuleDir, importPath) + '.ts';

  return {
    className,
    name,
    importPath,
    path
  };
}

// Step 4 - get indexAppRootTag => open ${appRoot}/${appComponentPath} - get from selector: '__value__'
function getAppRootTag(tree: Tree, entryComponentPath: string): string {
  const source = getSourceFile(tree, entryComponentPath);

  const node = findNode<ts.StringLiteral>(source, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'selector'},
    { kind: ts.SyntaxKind.StringLiteral }
  ]);

  const indexAppRootTag = node.text;
  return indexAppRootTag;
}
