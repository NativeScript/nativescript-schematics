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
  url,
  branchAndMerge,
  FileSystemCreateTree,
  InMemoryFileSystemTreeHost,
} from '@angular-devkit/schematics';
import { FileSystemHost } from '@angular-devkit/schematics/tools/file-system-host';
import { InsertChange } from '@schematics/angular/utility/change';
import { getConfig, CliConfig, configPath } from '@schematics/angular/utility/config';
import { Path, dasherize, normalize } from '@angular-devkit/core';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

import * as ts from 'typescript';

import { Schema as ModuleOptions } from './schema';
import {
  getSourceFile,
  findFullImports,
  findMetadataValueInArray,
  removeNode,
  copy,
  readFile,
} from '../utils';
import { join } from 'path';

export default function (options: ModuleOptions): Rule {
  let { name, sourceDir, path, flat } = options;
  name = dasherize(name);
  const dest = `/${sourceDir}/${path}/${flat ? '' : name}`;

  const web = shouldGenerateWebFiles(options);
  const dualFilesMap = getDualFilesMap(options);
  console.log(dualFilesMap)

  return chain([
    externalSchematic('@schematics/angular', 'module', options),
    web ?
      copyModules(Object.values(dualFilesMap)):
      renameModules(Object.values(dualFilesMap)),
    options.commonModule ?
      ensureCommonModule(dualFilesMap[getModuleBasename(options)].mobile) :
      noop(),
    options.routing ?
      ensureRouting(dualFilesMap[getRoutingBasename(options)].mobile):
      noop(),
  ]);
}

const dest = ({ name, sourceDir, path, flat }: ModuleOptions) =>
  `${sourceDir}/${path}/${flat ? '' : dasherize(name)}`;
const getModuleBasename = (options: ModuleOptions) =>
  normalize(`${dest(options)}/${options.name}.module`) as string;
const getRoutingBasename = (options: ModuleOptions) =>
  normalize(`${dest(options)}/${options.name}-routing.module`) as string;

const getDualFilesMap = (options: ModuleOptions) => {
  const files = [getModuleBasename(options)];
  if (options.routing) {
    files.push(getRoutingBasename(options));
  }

  return files
    .reduce((all, current) =>  {
      all[current] = {
        web: `${current}.ts`,
        mobile: `${current}.tns.ts`,
      }
      return all;
    }, {});
}



const shouldGenerateNsFiles = (options: ModuleOptions) => {
  if (options.nativescript !== undefined) {
    return options.nativescript;
  }

  const config = readFile<any>('package.json');
  try {
    return config.nativescript.id;
  } catch(e) {
    return false;
  }
}

const shouldGenerateWebFiles = (options: ModuleOptions) => {
  if (options.web !== undefined) {
    return options.web;
  }

  const configRelativePath = join('.', configPath);
  const config = readFile<CliConfig>(configRelativePath);
  try {
    return Object.values(config.apps).some(app => app.index);
  } catch(e) {
    return false;
  }
}

const copyModules = (paths: ({ web: string, mobile: string})[]) =>
  (tree: Tree) =>
    paths.forEach(({ web, mobile }) => copy(tree, web, mobile));

const renameModules = (paths: ({ web: string, mobile: string})[]) =>
  (tree: Tree) =>
    paths.forEach(({ web, mobile }) => tree.rename(web, mobile));

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
