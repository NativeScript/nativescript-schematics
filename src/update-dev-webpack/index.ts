import {
  Rule,
  Tree,
  chain,
  SchematicsException
} from '@angular-devkit/schematics';

import * as ts from 'typescript';

import { Schema as UpdateOptions } from './schema';
import { getSourceFile } from '../utils';
import { findNode, replaceTextInNode } from '../ast-utils';
const webpackConfigPath = 'webpack.config.js';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function(options: UpdateOptions): Rule {
  return chain([
    validatePrerequisits,
    validateOptions(options),
    updateTsConfigExtension(options.nsext),
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

const updateTsConfigExtension = (nsext: string) => (tree: Tree) => {
  const source = getSourceFile(tree, webpackConfigPath);
    const propertyToUpdate = '"tsconfig.esm.json"';
  
    const node = findNode<ts.PropertyAssignment>(source, [
      { kind: ts.SyntaxKind.NewExpression, name: 'nsWebpack.NativeScriptAngularCompilerPlugin' },
      { kind: ts.SyntaxKind.PropertyAssignment, name: 'tsConfigPath' }
    ]);
  
    // TODO: this specific config might change with the next update
    const tsConfigPath = `aot ? "tsconfig.aot.json" : "tsconfig${nsext}.json"`;
    replaceTextInNode(tree, node, propertyToUpdate, tsConfigPath);
}
