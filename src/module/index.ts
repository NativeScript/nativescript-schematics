import {
  Rule,
  SchematicsException,
  Tree,
  chain,
  externalSchematic,
  template,
  TemplateOptions,
  filter,
  noop,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { Path, dasherize, normalize } from '@angular-devkit/core';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

import * as ts from 'typescript';

import { Schema as ModuleOptions } from './schema';
import {
  getSourceFile,
  findFullImports,
  findMetadataValueInArray,
  removeNode,
} from '../utils';

export default function (options: ModuleOptions): Rule {
  let { name, sourceDir, path, flat } = options;
  name = dasherize(name);
  const dest = `/${sourceDir}/${path}/${flat ? '' : name}`;
  const modulePath = normalize(`${dest}/${name}.module.ts`);
  const routingModulePath = normalize(`${dest}/${name}-routing.module.ts`);

  return chain([
    externalSchematic('@schematics/angular', 'module', options),
    options.commonModule ? ensureCommonModule(modulePath) : noop(),
    options.routing ? ensureRouting(routingModulePath): noop(),
  ]);
}

const ensureCommonModule = (modulePath: string) =>
  (tree: Tree) => {
      addNSCommonModule(tree, modulePath);
      removeNGCommonModule(tree, modulePath);

      return tree;
  };

const ensureRouting = (routingModulePath: string) =>
  (tree: Tree) => {
    removeNGRouterModule(tree, routingModulePath);
    addNSRouterModule(tree, routingModulePath);

    return tree;
  };

const removeNGRouterModule = (tree: Tree, routingModulePath: string) => {
    const moduleToRemove = 'RouterModule';

    removeImport(tree, routingModulePath, moduleToRemove);
    removeMetadataArrayValue(tree, routingModulePath, 'imports', `${moduleToRemove}.forChild(routes)`);
    removeMetadataArrayValue(tree, routingModulePath, 'exports', moduleToRemove);
};

const addNSRouterModule = (tree: Tree, routingModulePath: string) => {
  let moduleSource = getSourceFile(tree, routingModulePath);
  const moduleName = 'NativeScriptRouterModule';

  const addedImport = addSymbolToNgModuleMetadata(
    moduleSource, routingModulePath,
    'imports', `${moduleName}.forChild(routes)`,
    'nativescript-angular/router'
  );
  const importRecorder = tree.beginUpdate(routingModulePath);

  addedImport.forEach((change: InsertChange) =>
    importRecorder.insertRight(change.pos, change.toAdd)
  );
  tree.commitUpdate(importRecorder);

  // refetch new content after the update
  moduleSource = getSourceFile(tree, routingModulePath);
  const addedExport = addSymbolToNgModuleMetadata(
    moduleSource, routingModulePath,
    'exports', moduleName
  );
  const exportRecorder = tree.beginUpdate(routingModulePath);
  addedExport.forEach((change: InsertChange) =>
    exportRecorder.insertRight(change.pos, change.toAdd)
  );
  tree.commitUpdate(exportRecorder);

  return tree;
};

const removeNGCommonModule = (tree: Tree, modulePath: string) => {
  const moduleName = 'CommonModule';
  removeImport(tree, modulePath, moduleName);
  removeMetadataArrayValue(tree, modulePath, 'imports', moduleName);

  return tree;
};
  
const addNSCommonModule = (tree: Tree, modulePath: string) => {
  const moduleSource = getSourceFile(tree, modulePath);
  const recorder = tree.beginUpdate(modulePath);

  const metadataChange = addSymbolToNgModuleMetadata(
    moduleSource, modulePath,
    'imports', 'NativeScriptCommonModule',
    'nativescript-angular/common');

  metadataChange.forEach((change: InsertChange) =>
    recorder.insertRight(change.pos, change.toAdd)
  );
  tree.commitUpdate(recorder);

  return tree;
};

const removeMetadataArrayValue = (tree: Tree, filePath: string, property: string, value: string) => {
  const source = getSourceFile(tree, filePath);
  const nodesToRemove = findMetadataValueInArray(source, property, value);

  nodesToRemove.forEach(declaration =>
    removeNode(declaration, filePath, tree)
  );
}

const removeImport = (tree: Tree, filePath: string, importName: string) => {
  const source = getSourceFile(tree, filePath);
  const importsToRemove = findFullImports(importName, source);

  importsToRemove.forEach(declaration =>
    removeNode(declaration, filePath, tree)
  );
};
