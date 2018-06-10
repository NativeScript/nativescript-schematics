import * as ts from 'typescript';
import { join, dirname, basename } from 'path';
import { Tree, SchematicsException } from '@angular-devkit/schematics';
// import { getWorkspace, WorkspaceProject } from '@schematics/angular/utility/config';

import { getSourceFile, getAngularJson } from './utils';
import { findNode, getFunctionParams, findImportPath } from './ast-utils';
import { SemVer, getAngularSemver, getAngularCLISemver } from './node-utils';

export interface AngularProjectSettings {
  /** ng cli Npm Version */
  ngCliSemVer: SemVer;
  /** ng Npm Version */
  ngSemVer: SemVer;

  /** default: "" */
  root: string;

  /** default: "src" */
  sourceRoot: string;
  
  /** default: "main"*/
  mainName: string;
  /** default: "src/main.ts"*/
  mainPath: string;

  /** default: "AppModule"*/
  entryModuleClassName: string;
  /** default: "App"*/
  entryModuleName: string;
  /** default: "src/app/app.module.ts"*/
  entryModulePath: string;
  /** default: "./app/app.module"*/
  entryModuleImportPath: string;

  /** default: "AppComponent" */
  entryComponentClassName: string;
  /** default: "App" */
  entryComponentName: string;
  /** default: "src/app/app.component.ts" */
  entryComponentPath: string;
  /** default: "./app.component" */
  entryComponentImportPath: string;

  /** default: "app-root"*/
  indexAppRootTag: string;
}

export interface CoreProjectSettings {
  root: string;
  sourceRoot: string;
  mainName: string;
  mainPath: string;

  ngCliSemVer: SemVer;
  ngSemVer: SemVer;
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

export function getAngularProjectSettings(tree: Tree, projectName: string = ''): AngularProjectSettings {
  const projectSettings = getCoreProjectSettings(tree, projectName);
  const entryModule = getEntryModuleMetadata(tree, projectSettings.mainPath);

  const entryComponent = getEntryComponentMetadata(tree, entryModule.path);
  const indexAppRootTag = getAppRootTag(tree, entryComponent.path);

  return {
    ngCliSemVer: projectSettings.ngCliSemVer,
    ngSemVer: projectSettings.ngSemVer,

    root: projectSettings.root,
    sourceRoot: projectSettings.sourceRoot,
    mainName: projectSettings.mainName,
    mainPath: projectSettings.mainPath,

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

// Step 1 - get appRoot => open .angular-cli.json -> get apps.root
export function getCoreProjectSettings(tree: Tree, projectName: string): CoreProjectSettings {
  const ngCliSemVer = getAngularCLISemver(tree);
  const ngSemVer = getAngularSemver(tree);
  
  // TODO: this might go away
  if (ngCliSemVer.major >= 6) {
    const project = getProjectObject(tree, projectName);

    const root = project.root;
    
    // this by default is src
    // const sourceRoot = dirname(mainPath);
    const sourceRoot = project.sourceRoot;
    
    // this by default is src/main.ts
    // settings.mainPath = 'src/main.ts';
    const mainPath: string = project.architect.build.options.main;

    // this by default is main
    // settings.mainName = 'main';
    const mainName = basename(mainPath).replace('.ts', '');

    return {
      ngCliSemVer,
      ngSemVer,

      root,
      sourceRoot,
      mainName,
      mainPath,
    };
  } else {
    throw new SchematicsException(`This schematic is not compatible with @angular/cli 1.x, use 6.x or newer`);
  }
}

// export function getProject(tree: Tree, projectName: string): WorkspaceProject {
//   const workspace = getWorkspace(tree);
//   return workspace.projects[projectName];
// }

export function getProjectObject(tree: Tree, projectName: string) {
  const angularJson = getAngularJson(tree);
  
  // return the requested project object
  if (projectName) {
    const project = angularJson.projects[projectName];
    if (!project) {
      throw new SchematicsException(`Couldn't find --projectName "${projectName}" in angular.json`);
    }

    return project;
  }

  // or return the default project
  if (angularJson.defaultProject) {
    return angularJson.projects[angularJson.defaultProject];
  }

  // or return the first project on the list
  // this is the same behaviour as in ng cli
  return Object.values(angularJson.projects)[0];
}

// Step 2 - get entryModule and entryModulePath   => open ${sourceRoot}/${main}.ts 
// - get entryModule from .bootstrapModule(__value__)
// - get entryModulePath from import { ${entryModule} } from "__value__" -- might need to remove ./
function getEntryModuleMetadata(tree: Tree, mainPath: string): ClassMetadata {
  const source = getSourceFile(tree, mainPath);

  const params = getFunctionParams(source, 'bootstrapModule');
  const className = params[0];

  const name = className.replace('Module', '');

  const importPath: string = findImportPath(source, className);

  const mainDir = dirname(mainPath);
  const path = join(mainDir, importPath) + '.ts';

  return {
    className,
    name,
    importPath,
    path
  }
}

// Step 3 - get appComponent and appComponentPath => open ${appRoot}/${entryModulePath} 
// - get appComponent from bootstrap: [ __value__ ]
// - get appComponentPath from import { ${appComponent} } from "__value__"
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

// Step 4 - get indexAppRootTag => open ${appRoot}/${appComponentPath} - get from selector: "__value__"
function getAppRootTag(tree: Tree, entryComponentPath: string): string {
  const source = getSourceFile(tree, entryComponentPath);

  const node = findNode<ts.StringLiteral>(source, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'selector'},
    { kind: ts.SyntaxKind.StringLiteral }
  ]);

  const indexAppRootTag = node.text;
  return indexAppRootTag;
}
