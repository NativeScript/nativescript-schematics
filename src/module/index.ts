import {
  Rule,
  Tree,
  chain,
  externalSchematic,
  SchematicsException,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { normalize } from '@angular-devkit/core';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

import { Schema as ModuleOptions } from './schema';
import {
  getExtensions,
  getSourceFile,
  removeNode,
  copy,
  ns,
  web,
  removeNsSchemaOptions,
} from '../utils';
import {
  findFullImports,
  findMetadataValueInArray,
} from '../ast-utils';
import { dasherize } from '@angular-devkit/core/src/utils/strings';

interface Extensions {
  web: string;
  ns: string;
};

let originalExtensions;
let extensions: Extensions;

export default function (options: ModuleOptions): Rule {
  return chain([
    validateOptions(options),
    externalSchematic('@schematics/angular', 'module', removeNsSchemaOptions(options)),

    (tree: Tree) => fillExtensions(tree, options),

    (tree: Tree) =>
      web(tree, options) ? renameWebModules()(tree) : tree,

    (tree: Tree) =>
      ns(tree, options) ? performNsModifications(options)(tree) : tree,
  ]);
};

const renameWebModules = () =>
  (tree: Tree) => {
    const files = getFilesBasenames();

    const originalToWeb = files.map(f => ({
      from: getOriginalFile(f),
      to: getWebFile(f),
    }));

    renameFiles(originalToWeb)(tree);
  };

const performNsModifications = (options: ModuleOptions) =>
  (tree: Tree) => {
    const files = getFilesBasenames();

    if (web(tree, options)) {
      const webToNs = files.map(f => ({
        from: getWebFile(f),
        to: getNsFile(f),
      }));

      copyFiles(webToNs)(tree);
    } else {
      const originalToNs = files.map(f => ({
        from: getOriginalFile(f),
        to: getNsFile(f),
      }));

      renameFiles(originalToNs)(tree);
    }

    const moduleFile = getModuleBasename(options);
    const nsModule = getNsFile(moduleFile);
    ensureSchema(nsModule)(tree);

    if (options.commonModule) {
      ensureCommonModule(nsModule)(tree);
    }

    if (options.routing) {
      const routingModule = getRoutingBasename(options);
      const nsRoutingModule = getNsFile(routingModule);
      ensureRouting(nsRoutingModule)(tree);
    }
  };

const validateOptions = (options) =>
  (tree: Tree) => {
    if (!web(tree, options) && !ns(tree, options)) {
      throw new SchematicsException('You need to specify project type!');
    }

    return tree;
  };

const dest = ({ name, sourceDir, path, flat }: ModuleOptions) =>
  `${sourceDir}/${path}/${flat ? '' : dasherize(name)}`;
const getModuleBasename = (options: ModuleOptions) =>
  normalize(`${dest(options)}/${options.name}.module`) as string;
const getRoutingBasename = (options: ModuleOptions) =>
  normalize(`${dest(options)}/${options.name}-routing.module`) as string;

const fillExtensions = (tree: Tree, options: ModuleOptions) => {
  extensions = getExtensions(tree, options);

  originalExtensions = {
    [getModuleBasename(options)]: '.ts',
  };

  if (options.routing) {
    Object.assign(originalExtensions, {
      [getRoutingBasename(options)]: '.ts',
    });
  }
};

const getFilesBasenames = () => Object.keys(originalExtensions);

const getOriginalFile = (basename: string) => {
  return `${basename}${originalExtensions[basename]}`;
}

const getWebFile = (basename: string) =>
  `${basename}${extensions.web}${originalExtensions[basename]}`;

const getNsFile = (basename: string) =>
  `${basename}${extensions.ns}${originalExtensions[basename]}`;

const copyFiles = (paths: ({ from: string, to: string})[]) =>
  (tree: Tree) =>
    paths.forEach(({ from, to }) => copy(tree, from, to));

const renameFiles = (paths: ({ from: string, to: string })[]) =>
  (tree: Tree) =>
    paths.forEach(({ from, to }) => tree.rename(from, to));

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

const ensureSchema = (modulePath: string) =>
  (tree: Tree) => {
    const moduleSource = getSourceFile(tree, modulePath);
    const recorder = tree.beginUpdate(modulePath);

    const metadataChange = addSymbolToNgModuleMetadata(
      moduleSource, modulePath,
      'schemas', 'NO_ERRORS_SCHEMA',
      '@angular/core');

    metadataChange.forEach((change: InsertChange) =>
      recorder.insertRight(change.pos, change.toAdd)
    );
    tree.commitUpdate(recorder);

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
