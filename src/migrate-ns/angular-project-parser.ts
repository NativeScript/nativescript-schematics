import * as ts from 'typescript';
import { join } from 'path';
import { Tree, SchematicContext } from '@angular-devkit/schematics';

import { getSourceFile } from '../utils';
import { getFileContents } from './utils';
import { findNode, getFunctionParams, findImportPath } from './ast-utils';

export interface AngularProjectSettings {
  appRoot: string,

  mainName: string,
  mainPath: string;

  entryModuleName: string,
  entryModulePath: string,
  entryModuleImportPath: string,

  entryComponentName: string,
  entryComponentPath: string,
  entryComponentImportPath: string,

  indexAppRootTag: string,
}

export function getAngularProjectSettings(tree: Tree, context: SchematicContext): AngularProjectSettings {
    const settings: AngularProjectSettings = {
      appRoot: '---',

      // main.ts
      mainName: '---',
      mainPath: '---',

      // app.module.ts
      entryModuleName: '---',
      entryModulePath: '---',
      entryModuleImportPath: '---',

      // app.componet.ts
      entryComponentName: '---',
      entryComponentPath: '---',
      entryComponentImportPath: '---',

      // index.html
      indexAppRootTag: '---',
    }

    parseAngularCli(tree, context, settings);
    parsePackageJson(tree, context, settings);
    parseMain(tree, context, settings);
    parseEntryModule(tree, context, settings);
    parseEntryComponent(tree, context, settings);

    return settings;
  }

// Step 1 - get appRoot => open .angular-cli.json -> get apps.root
function parseAngularCli(tree: Tree, context: SchematicContext, settings: AngularProjectSettings) {
  const angularCliJson = JSON.parse(getFileContents(tree, '.angular-cli.json'));
  settings.appRoot = angularCliJson.apps[0].root;

  context.logger.error(`appRoot: ${settings.appRoot}`);
}

// Step 2 - get main => open ${appRoot}/package.json -> get main - remove '.js'
function parsePackageJson(tree: Tree, context: SchematicContext, settings: AngularProjectSettings) {
  const path = `${settings.appRoot}/package.json`;
  const appPackageJson = JSON.parse(getFileContents(tree, path));
  settings.mainName = appPackageJson.main.replace('.js', '');
  settings.mainPath = `${settings.appRoot}/${settings.mainName}.ts`;

  context.logger.info(`main: ${settings.mainName}`);
}

// Step 3 - get entryModule and entryModulePath   => open ${appRoot}/${main}.ts 
// - get entryModule from .bootstrapModule(__value__)
// - get entryModulePath from import { ${entryModule} } from "__value__" -- might need to remove ./
function parseMain(tree: Tree, _context: SchematicContext, settings: AngularProjectSettings) {
  // const path = `${settings.appRoot}/${settings.main}.ts`;
  const source = getSourceFile(tree, settings.mainPath);

  const params = getFunctionParams(source, 'bootstrapModule');
  const entryModuleName = params[0];
  settings.entryModuleName = entryModuleName;

  const importPath: string = findImportPath(source, entryModuleName);

  settings.entryModuleImportPath = importPath;
  settings.entryModulePath = join(settings.appRoot, importPath) + '.ts';
}

// Step 4 - get appComponent and appComponentPath => open ${appRoot}/${entryModulePath} 
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
  settings.entryComponentName = componentName;

  const importPath = findImportPath(source, componentName);
  settings.entryComponentImportPath = importPath;
  settings.entryComponentPath = join(settings.appRoot, importPath) + '.ts';
}

// Step 5 - get indexAppRootTag => open ${appRoot}/${appComponentPath} - get from selector: "__value__"
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
