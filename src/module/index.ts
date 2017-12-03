import {
  Rule,
  SchematicsException,
  Tree,
  chain,
  externalSchematic,
  template,
  TemplateOptions,
  filter,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { Path, dasherize, normalize } from '@angular-devkit/core';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

import * as ts from 'typescript';

import { Schema as ModuleOptions } from './schema';
import {
  getSourceFile,
  findFullImports,
  findMetadataImportedModules,
  removeNode
} from '../utils';

export default function (options: ModuleOptions): Rule {
  let { name, sourceDir, path, flat } = options;
  name = dasherize(name);
  const modulePath = normalize(
    `/${sourceDir}/${path}/`
    + (flat ? '' : name + '/')
    + name + '.module.ts'
  );

  return chain([
    externalSchematic('@schematics/angular', 'module', options),
    filter((path: Path) => !path.match(/\.spec\.ts$/)),
    addNSCommonModule(modulePath),
    removeNGCommonModule(modulePath),
  ]);
}

const addNSCommonModule = (modulePath: string) =>
  (tree: Tree) => {
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

const removeNGCommonModule = (modulePath: string) =>
  (tree: Tree) => removeImportedModule(tree, modulePath, "CommonModule");

const removeImportedModule = (tree: Tree, modulePath: string, importName: string) => {
    removeFullImport(tree, modulePath, importName);
    removeMetadataImport(tree, modulePath, importName);

    return tree;
}

const removeMetadataImport = (tree: Tree, filePath: string, importName: string) => {
  const source = getSourceFile(tree, filePath);
  const importsToRemove = findMetadataImportedModules(source, importName);

  importsToRemove.forEach(declaration =>
    removeNode(declaration, filePath, tree)
  );
}

// meant to remove only imports of type
// import { SomeModule } from "some-package"
const removeFullImport = (tree: Tree, filePath: string, importName: string) => {
  const source = getSourceFile(tree, filePath);
  const importsToRemove = findFullImports(importName, source);

  importsToRemove.forEach(declaration =>
    removeNode(declaration, filePath, tree)
  );
};
