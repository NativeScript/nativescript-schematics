import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  apply,
  url,
  template,
  branchAndMerge,
  mergeWith,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { addProviderToModule } from '@schematics/angular/utility/ast-utils';

import { dirname } from 'path';

import { Schema as MigrateComponentSchema } from './schema';

import { getSourceFile, addExtension, findRelativeImportPath } from '../utils';
import { insertModuleId } from '../ast-utils';
import { ComponentInfo, parseComponentInfo } from './component-info-utils';

// let extensions: Extensions;

export default function(options: MigrateComponentSchema): Rule {
  let componentInfo: ComponentInfo;
  return chain([
    (tree: Tree, context: SchematicContext) => {
      componentInfo = parseComponentInfo(options)(tree, context);
    },
    (tree: Tree) => 
      updateComponentClass(componentInfo)(tree),
    
    (tree: Tree, context: SchematicContext) =>
      addNsFiles(componentInfo, options)(tree, context),

    (tree: Tree) =>
      addComponentToNsModuleProviders(componentInfo, options)(tree)
  ]);
}

const updateComponentClass = (componentInfo: ComponentInfo) => (tree: Tree) => {
  insertModuleId(componentInfo.componentPath)(tree);
}

const addNsFiles = (componentInfo: ComponentInfo, options: MigrateComponentSchema) => (tree: Tree, context: SchematicContext) => {
  const nsext = '.tns';
  // const nsext = '.android';

  context.logger.info('Adding {N} files');
  const templateOptions = {
    dir: dirname(componentInfo.componentHtmlPath),
    
    addNsExtension: (path: string) => addExtension(path, nsext),

    htmlFileName: componentInfo.componentHtmlPath,

    componentName: options.name
  };
  const templateSource = apply(url('./_ns-files'), [
      template(templateOptions)
  ]);
  return branchAndMerge(mergeWith(templateSource))(tree, context);
};

const addComponentToNsModuleProviders = (componentInfo: ComponentInfo, options: MigrateComponentSchema) => (tree: Tree) => {
  if (options.skipModule) {
    return;
  }
  
  const nsext = '.tns';
  const nsModulePath = addExtension(componentInfo.modulePath, nsext);
  
  // Get the changes required to update the @NgModule
  const changes = addProviderToModule(
    getSourceFile(tree, nsModulePath),
    nsModulePath, // <- this doesn't look like it is in use
    componentInfo.className,
    findRelativeImportPath(nsModulePath, componentInfo.componentPath)
  );
    
  // Save changes
  const recorder = tree.beginUpdate(nsModulePath);
  changes.forEach((change: InsertChange) =>
    recorder.insertRight(change.pos, change.toAdd)
  );
  tree.commitUpdate(recorder);
}
