import * as ts from 'typescript';
import { join, dirname } from 'path';
import { Tree, SchematicContext } from '@angular-devkit/schematics';

import { getSourceFile, getJsonFile, getFileContents } from './utils';
import { findNode, getFunctionParams, findImportPath } from './ast-utils';

export interface AngularProjectSettings {
  /** default: "src" */
  appRoot: string,
  
  /** default: "main"*/
  mainName: string,
  /** default: "src/main.ts"*/
  mainPath: string;

  /** default: "AppModule"*/
  entryModuleClassName: string,
  /** default: "App"*/
  entryModuleName: string,
  /** default: "src/app/app.module.ts"*/
  entryModulePath: string,
  /** default: "./app/app.module"*/
  entryModuleImportPath: string,

  /** default: "AppComponent" */
  entryComponentClassName: string,
  /** default: "App" */
  entryComponentName: string;
  /** default: "src/app/app.component.ts" */
  entryComponentPath: string,
  /** default: "./app.component" */
  entryComponentImportPath: string,

  /** default: "app-root"*/
  indexAppRootTag: string,
}

export function getAngularProjectSettings(tree: Tree, context: SchematicContext): AngularProjectSettings {
    const settings: AngularProjectSettings = {
      appRoot: '---',

      // main.ts
      mainName: '---',
      mainPath: '---',

      // app.module.ts
      entryModuleClassName: '---',
      entryModuleName: '---',
      entryModulePath: '---',
      entryModuleImportPath: '---',

      // app.componet.ts
      entryComponentClassName: '---',
      entryComponentName: '---',
      entryComponentPath: '---',
      entryComponentImportPath: '---',

      // index.html
      indexAppRootTag: '---',
    }

    parseAngularCli(tree, context, settings);
    parseMain(tree, context, settings);
    parseEntryModule(tree, context, settings);
    parseEntryComponent(tree, context, settings);

    return settings;
  }

// Step 1 - get appRoot => open .angular-cli.json -> get apps.root
function parseAngularCli(tree: Tree, _context: SchematicContext, settings: AngularProjectSettings) {
  // For Angular before 6.0
  if (tree.exists('.angular-cli.json')) {
    const angularCliJson = getJsonFile<any>(tree, '.angular-cli.json');
    
    const app = angularCliJson.apps[0];
    settings.appRoot = app.root;
    
    if (app.main) {
      settings.mainName = app.main.replace('.ts', '');
    } else {
      // if you are in a {N} project, then get main from package.json
      settings.mainName = getMainFromNativeScriptPackageJson(tree, settings.appRoot);
    } 
    settings.mainPath = `${settings.appRoot}/${settings.mainName}.ts`;
  } else {
    // for Angular 6.0 and after
    // const angularJson = getJsonFile(tree, 'angular.json');
    settings.appRoot = 'src';
    settings.mainName = 'main';
    settings.mainPath = 'src/main.ts';
    // angularJson.projects
  }
}

// get main => open ${appRoot}/package.json -> get main - remove '.js'
function getMainFromNativeScriptPackageJson(tree: Tree, appRoot: string) {
  const path = `${appRoot}/package.json`;
  const appPackageJson = JSON.parse(getFileContents(tree, path));
  return appPackageJson.main.replace('.js', '');
}

// Step 2 - get entryModule and entryModulePath   => open ${appRoot}/${main}.ts 
// - get entryModule from .bootstrapModule(__value__)
// - get entryModulePath from import { ${entryModule} } from "__value__" -- might need to remove ./
function parseMain(tree: Tree, _context: SchematicContext, settings: AngularProjectSettings) {
  // const path = `${settings.appRoot}/${settings.main}.ts`;
  const source = getSourceFile(tree, settings.mainPath);

  const params = getFunctionParams(source, 'bootstrapModule');
  const entryModuleClassName = params[0];
  settings.entryModuleClassName = entryModuleClassName;
  settings.entryModuleName = entryModuleClassName.replace('Module', '');

  const importPath: string = findImportPath(source, entryModuleClassName);

  settings.entryModuleImportPath = importPath;
  
  const mainDir = dirname(settings.mainPath);
  settings.entryModulePath = join(mainDir, importPath) + '.ts';
}

// Step 3 - get appComponent and appComponentPath => open ${appRoot}/${entryModulePath} 
// - get appComponent from bootstrap: [ __value__ ]
// - get appComponentPath from import { ${appComponent} } from "__value__"
function parseEntryModule(tree: Tree, _context: SchematicContext, settings: AngularProjectSettings) {
  const source = getSourceFile(tree, settings.entryModulePath);
  
  // find -> bootstrap -> array -> array value
  // bootstrap: [
  //   AppComponent  <- end result
  // ],
  const node = findNode<ts.ArrayLiteralExpression>(source, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'bootstrap'},
    { kind: ts.SyntaxKind.ArrayLiteralExpression }
    // { kind: ts.SyntaxKind.Identifier }
  ]);

  const componentName = node.elements[0].getText();
  settings.entryComponentClassName = componentName;
  settings.entryComponentName = componentName.replace('Component', '');

  const importPath = findImportPath(source, componentName);
  settings.entryComponentImportPath = importPath;

  const entryModuleDir = dirname(settings.entryModulePath);
  settings.entryComponentPath = join(entryModuleDir, importPath) + '.ts';
}

// Step 4 - get indexAppRootTag => open ${appRoot}/${appComponentPath} - get from selector: "__value__"
function parseEntryComponent(tree: Tree, _context: SchematicContext, settings: AngularProjectSettings) {
  const source = getSourceFile(tree, settings.entryComponentPath);

  const node = findNode<ts.StringLiteral>(source, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'selector'},
    { kind: ts.SyntaxKind.StringLiteral }
    // { kind: ts.SyntaxKind.Identifier }
  ]);

  const indexAppRootTag = node.text;
  settings.indexAppRootTag = indexAppRootTag;
}
