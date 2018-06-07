import {
  Rule,
  Tree,
  chain,
  externalSchematic,
  SchematicsException,
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
import { removeNsSchemaOptions, getExtensions, PlatformUse, getPlatformUse, Extensions, addExtension } from '../utils';
import { parseName } from '@schematics/angular/utility/parse-name';

class ModuleInfo {
  name: string;
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

export default function (options: ModuleOptions): Rule {
  let platformUse: PlatformUse;
  let moduleInfo: ModuleInfo;

  return chain([
    (tree: Tree) => {
      platformUse = getPlatformUse(tree, options);
    },
    () => {
      validateOptions(platformUse, options);
    },

    externalSchematic('@schematics/angular', 'module', removeNsSchemaOptions(options)),

    (tree: Tree) => {
      extensions = getExtensions(tree, options);
      moduleInfo = parseModuleInfo(tree, options);
    },

    (tree: Tree) =>
      platformUse.useWeb ? renameWebModules(moduleInfo)(tree) : tree,

    (tree: Tree) => {
      if (platformUse.nsOnly || !platformUse.useNs) {
        // no need to move / rename module files
        return;
      } else {
        const updates = prepareFileUpdates(moduleInfo);
        
        if (platformUse.useWeb) {
          // we need to copy the module files using .tns extension
          copyFiles(updates)(tree);
        } else {
          // we need to update module files to .tns extension
          renameFiles(updates)(tree);
        }
      }
    },

    (tree: Tree) => {
      if (platformUse.useNs) {
        performNsModifications(moduleInfo, options)(tree);
      }
    }
  ]);
};

const validateOptions = (platformUse: PlatformUse, options: ModuleOptions) =>
  () => {
    if (!options.nativescript && !options.web) {
      throw new SchematicsException(`You shouldn't disable both --web and --nativescript flags`);
    }

    // this should always have at least ns, otherwise this schematic shouldn't be used
    if (!platformUse.useWeb && !platformUse.useNs) {
      throw new SchematicsException('You need to specify project type!');
    }
  };

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

const prepareFileUpdates = (moduleInfo: ModuleInfo) => {
  const updates: any[] = [{
    from: moduleInfo.moduleFilePath,
    to: moduleInfo.nsModuleFilePath
  }];

  if (moduleInfo.routingFilePath) {
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

const copyFiles = (paths: ({ from: string, to: string})[]) =>
  (tree: Tree) =>
    paths.forEach(({ from, to }) => copy(tree, from, to));

const renameFiles = (paths: ({ from: string, to: string })[]) =>
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
