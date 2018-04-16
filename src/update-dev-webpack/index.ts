import {
  Rule,
  Tree,
  chain,
  SchematicsException
} from '@angular-devkit/schematics';

import * as ts from 'typescript';

import { Schema as UpdateOptions } from './schema';
import { getSourceFile, getJsonFile } from '../utils';
import { findNode } from '../ast-utils';
const webpackConfigPath = 'webpack.config.js';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function(options: UpdateOptions): Rule {
  return chain([
    validatePrerequisits,
    validateOptions(options),
    // updateMainTsExtension(options.main, options.nsext),
    updateTsConfigExtension(options.nsext),
    updateEntryModuleExtension(options),
    updateAppPackage(options)
  ])
}

const validatePrerequisits = (tree: Tree) => {
  //make sure that nativescript-dev-webpack is installed
  if (!tree.exists(webpackConfigPath)) {
    throw new SchematicsException(`nativescript-dev-webpack is missing. Run:
npm nativescript-dev-webpack
and try again.`);
  }
}

const validateOptions = (options: UpdateOptions) => () => {
  if (options.nsext.charAt(0) !== '.') {
    throw new SchematicsException(`nsext [${options.nsext}] should start with a .`);
  }
};

/**
 * Find tsConfigPath in webpack.config.js
 * If the value is   tsConfigPath: "./tsconfig.json"
 * then update it to tsConfigPath: "./tsconfig.tns.json"
 */
const updateTsConfigExtension = (nsext: string) => (tree: Tree) => {
  const source = getSourceFile(tree, webpackConfigPath);
  const fileToUpdate = 'tsconfig.json';

  const node = findNode(source, [
    { kind: ts.SyntaxKind.VariableDeclaration, name: 'ngToolsWebpackOptions' },
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'tsConfigPath' }
  ], fileToUpdate);

  const updatedFilePath = insertTextWhere(fileToUpdate, nsext, '.json');
  replaceTextInNode(tree, node, fileToUpdate, updatedFilePath);
}

/**
 * Find entryModule in webpack.config.js
 * If the value is   entryModule: resolve(__dirname, "app/app.module#AppModule"),
 * then update it to entryModule: resolve(__dirname, "app/app.module.tns#AppModule"),
 */
const updateEntryModuleExtension = (options: UpdateOptions) => (tree: Tree) => {
  const source = getSourceFile(tree, webpackConfigPath);
  // const propertyText = 'module#AppModule';
  const propertyText = `module#${options.entryModuleClassName}`;

  const node = findNode<ts.CallExpression>(source, [
    { kind: ts.SyntaxKind.NewExpression, name: 'nsWebpack.NativeScriptAngularCompilerPlugin' },
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'entryModule' },
    { kind: ts.SyntaxKind.CallExpression, name: 'resolve' },
  ], propertyText);

  const currentEntryModuleNode = node.arguments[1];
  const newEntryModulePath = `"${options.entryModulePath}${options.nsext}#${options.entryModuleClassName}"`

  updateNodeText(tree, currentEntryModuleNode, newEntryModulePath);
}

const updateAppPackage = (options: UpdateOptions) => (tree: Tree) => {
  const packageJsonUrl = `${options.sourceDir}/package.json`;
  const packageJson = getJsonFile(tree, packageJsonUrl);
  
  packageJson["main"] = `${options.main}${options.nsext}.js`;
  
  tree.overwrite(packageJsonUrl, JSON.stringify(packageJson, null, 2));
}


function insertTextWhere(source: string, text: string, where: string) {
  const index = source.indexOf(where);
  return source.substring(0, index) + text + source.substring(index);
}

function updateNodeText(tree: Tree, node: ts.Node, newText: string) {
  const recorder = tree.beginUpdate(node.getSourceFile().fileName);
  recorder.remove(node.getStart(), node.getText().length);
  recorder.insertLeft(node.getStart(), newText);
  tree.commitUpdate(recorder);
}

function replaceTextInNode(tree: Tree, node: ts.Node, oldText: string, newText: string) {
  const index = node.getStart() + node.getText().indexOf(oldText);
  const recorder = tree.beginUpdate(node.getSourceFile().fileName);
  recorder.remove(index, oldText.length);
  recorder.insertLeft(index, newText);
  tree.commitUpdate(recorder);
}