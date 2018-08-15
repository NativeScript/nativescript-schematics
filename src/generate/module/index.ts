import {
  Rule,
  Tree,
  chain,
  externalSchematic,
  SchematicsException,
  mergeWith,
  apply,
  url,
  template,
  move,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

import { Schema as ModuleOptions } from './schema';
import {
  getSourceFile,
  copy,
} from '../../utils';
import {
  removeImport,
  removeMetadataArrayValue,
} from '../../ast-utils';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { removeNsSchemaOptions, getExtensions, PlatformUse, getPlatformUse, Extensions, addExtension, validateGenerateOptions } from '../utils';
import { parseName } from '@schematics/angular/utility/parse-name';

class ModuleInfo {
  name: string;
  path: string;

  moduleFilePath: string;
  routingFilePath: string;

  nsModuleFilePath: string;
  nsRoutingFilePath: string;

  webModuleFilePath: string;
  webRoutingFilePath: string;

  constructor() {
    this.routingFilePath = '';
  }
}

let extensions: Extensions;

interface FileNameChange {
  from: string,
  to: string
}

export default function (options: ModuleOptions): Rule {
  let platformUse: PlatformUse;
  let moduleInfo: ModuleInfo;

  return chain([
    (tree: Tree) => {
      platformUse = getPlatformUse(tree, options);

      if (platformUse.nsOnly && options.spec !== true) {
        options.spec = false;
      }

      validateGenerateOptions(platformUse, options);
    },

    () =>
      externalSchematic('@schematics/angular', 'module', removeNsSchemaOptions(options)),

    (tree: Tree) => {
      extensions = getExtensions(tree, options);
      moduleInfo = parseModuleInfo(tree, options);
    },

    (tree: Tree) => {
      if (!platformUse.useNs) {
        return tree;
      }

      const updates = prepareNsModulesUpdates(moduleInfo);

      if (platformUse.useWeb) {
        // we need to copy the module files using .tns extension
        copyFiles(updates)(tree);
      } else {
        // we need to update module files to .tns extension
        renameFiles(updates)(tree);
      }
    },

    (tree: Tree) =>
      (platformUse.useWeb && extensions.web)
        ? renameWebModules(moduleInfo)(tree) : tree,

    (tree: Tree) => {
      if (platformUse.useNs) {
        performNsModifications(moduleInfo, options)(tree);
      }
    },

    (tree: Tree) => (platformUse.nsOnly) ?
      tree : addCommonFile(moduleInfo)
  ]);
};

const addCommonFile = (moduleInfo: ModuleInfo) => {
  return mergeWith(
    apply(url('./_files'), [
      template({
        name: moduleInfo.name
      }),
      move(moduleInfo.path)
    ]),
  )
}

const parseModuleInfo = (tree: Tree, options: ModuleOptions): ModuleInfo => {
  const moduleInfo = new ModuleInfo();

  const parsedPath = parseName(options.path || '', options.name);
  moduleInfo.name = dasherize(parsedPath.name);
  const className = `/${moduleInfo.name}.module.ts`;
  const routingName = `/${moduleInfo.name}-routing.module.ts`;

  tree.actions.forEach(action => {
    if (action.path.endsWith(className)) {
      const file = action.path;
      moduleInfo.moduleFilePath = file;
      moduleInfo.nsModuleFilePath = addExtension(file, extensions.ns);
      moduleInfo.webModuleFilePath = addExtension(file, extensions.web);
    }

    if (action.path.endsWith(routingName)) {
      const file = action.path;
      moduleInfo.routingFilePath = file;
      moduleInfo.nsRoutingFilePath = addExtension(file, extensions.ns);
      moduleInfo.webRoutingFilePath = addExtension(file, extensions.web);
    }
  });

  if (!moduleInfo.moduleFilePath) {
    throw new SchematicsException(`Failed to find generated module files from @schematics/angular. Please contact the @nativescript/schematics author.`);
  }

  moduleInfo.path = parseName('', moduleInfo.moduleFilePath).path;

  return moduleInfo;
}

const renameWebModules = (moduleInfo: ModuleInfo) =>
  (tree: Tree) => {
    const files = [{
      from: moduleInfo.moduleFilePath,
      to: moduleInfo.webModuleFilePath
    }];

    if (moduleInfo.nsRoutingFilePath) {
      files.push({
        from: moduleInfo.routingFilePath,
        to: moduleInfo.webRoutingFilePath
      });
    }

    renameFiles(files)(tree);
  };

const prepareNsModulesUpdates = (moduleInfo: ModuleInfo) => {
  const updates: FileNameChange[] = [];

  if (moduleInfo.moduleFilePath !== moduleInfo.nsModuleFilePath) {
    updates.push({
      from: moduleInfo.moduleFilePath,
      to: moduleInfo.nsModuleFilePath
    });
  }

  if (moduleInfo.routingFilePath && moduleInfo.routingFilePath !== moduleInfo.nsRoutingFilePath) {
    updates.push({
      from: moduleInfo.routingFilePath,
      to: moduleInfo.nsRoutingFilePath
    });
  }

  return updates;
}

const performNsModifications = (moduleInfo: ModuleInfo, options: ModuleOptions) =>
  (tree: Tree) => {
    addSchema(moduleInfo.nsModuleFilePath)(tree);

    if (options.commonModule) {
      ensureCommonModule(moduleInfo.nsModuleFilePath)(tree);
    }

    if (options.nativescript && options.routing) {
      ensureNsRouting(tree, moduleInfo.nsRoutingFilePath);
    }
  };

/**
 * Updates routing.module file
 * Changes all references from RouterModule to NativeScriptRouterModule
 * Additionally it updates imports for NativeScriptRouterModule
 */
const ensureNsRouting = (tree: Tree, path: string) => {
  const source = getSourceFile(tree, path);
  const fileText = source.getText();

  const importFrom = `, NativeScriptRouterModule } from '@angular/router';`;
  const importTo = ` } from '@angular/router';
import { NativeScriptRouterModule } from 'nativescript-angular/router';`

  const newText = fileText.replace(/RouterModule/g, 'NativeScriptRouterModule')
    .replace(importFrom, importTo);

  const recorder = tree.beginUpdate(path);
  recorder.remove(0, fileText.length);
  recorder.insertLeft(0, newText);
  tree.commitUpdate(recorder);
}

const copyFiles = (paths: FileNameChange[]) =>
  (tree: Tree) =>
    paths.forEach(({ from, to }) => copy(tree, from, to));

const renameFiles = (paths: FileNameChange[]) =>
  (tree: Tree) =>
    paths.forEach(({ from, to }) => tree.rename(from, to));

/*
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
*/
const ensureCommonModule = (modulePath: string) =>
  (tree: Tree) => {
    addNSCommonModule(tree, modulePath);
    removeNGCommonModule(tree, modulePath);

    return tree;
  };

const addSchema = (modulePath: string) =>
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
