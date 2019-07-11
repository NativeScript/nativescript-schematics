import { dirname, basename } from 'path';
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
  SchematicsException,
  noop,
  schematic,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { addDeclarationToModule } from '@schematics/angular/utility/ast-utils';

import { addExtension, findRelativeImportPath, getFileContents } from '../utils';
import { getNsConfigExtension, Extensions } from '../generate/utils';
import { Schema as ConvertRelativeImportsSchema } from '../convert-relative-imports/schema';
import { getSourceFile } from '../ts-utils';

import { ComponentInfo, parseComponentInfo } from './component-info-utils';
import { Schema as MigrateComponentSchema } from './schema';

let extensions: Extensions;

export default function (options: MigrateComponentSchema): Rule {
  let componentInfo: ComponentInfo;
  return chain([
    (tree: Tree) => {
      const nsconfigExtensions = getNsConfigExtension(tree);
      extensions = {
        ns: options.nsext || nsconfigExtensions.ns,
        web: options.webext || nsconfigExtensions.web
      }
    },
    (tree: Tree, context: SchematicContext) => {
      componentInfo = parseComponentInfo(options)(tree, context);
    },

    (tree: Tree, context: SchematicContext) =>
      addNsFiles(componentInfo, options)(tree, context),

    (tree: Tree, context: SchematicContext) =>
      addNsStyle(componentInfo, options)(tree, context),

    (tree: Tree) =>
      addComponentToNsModuleProviders(componentInfo, options)(tree),

    options.skipConvertRelativeImports ? noop() : schematic<ConvertRelativeImportsSchema>('convert-relative-imports', options)
  ]);
}

const addNsFiles = (componentInfo: ComponentInfo, options: MigrateComponentSchema) => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding {N} files');

  let webTemplate = getFileContents(tree, componentInfo.componentHtmlPath);
  webTemplate = parseComments(webTemplate);

  const templateOptions = {
    path: dirname(componentInfo.componentHtmlPath),
    htmlFileName: basename(componentInfo.componentHtmlPath),

    addNsExtension: (path: string) => addExtension(path, extensions.ns),

    componentName: options.name,

    webTemplate
  };
  const templateSource = apply(url('./_ns-files'), [
    template(templateOptions)
  ]);
  return branchAndMerge(mergeWith(templateSource))(tree, context);
};

/**
 * Replace all --> with ->,
 * This is so that the comments don't accidentally close the comment
 * from the .tns.html file
 */
const parseComments = (htmlFileContents: string) =>
  htmlFileContents.replace(/-->/g, '->');

const addComponentToNsModuleProviders = (componentInfo: ComponentInfo, options: MigrateComponentSchema) => (tree: Tree) => {
  if (options.skipModule) {
    return;
  }

  const nsModulePath = addExtension(componentInfo.modulePath, extensions.ns);

  // check if the {N} version of the @NgModule exists
  if (!tree.exists(nsModulePath)) {
    throw new SchematicsException(`Module file [${nsModulePath}] doesn't exist.
Create it if you want the schematic to add ${componentInfo.className} to its module declarations,
or if you just want to update the component without updating its module, then rerun this command with --skip-module flag`);
  }

  // Get the changes required to update the @NgModule
  const changes = addDeclarationToModule(
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

const addNsStyle = (componentInfo: ComponentInfo, options: MigrateComponentSchema) => (tree: Tree, context: SchematicContext) => {
  if (!componentInfo.componentStylePath || !options.style) {
    return noop;
  }

  context.logger.info('Adding {N} StyleSheet');

  const templateOptions = {
    path: dirname(componentInfo.componentHtmlPath),
    styleFileName: basename(componentInfo.componentStylePath),

    addNsExtension: (path: string) => addExtension(path, extensions.ns),
  };

  const templateSource = apply(url('./_ns-style'), [
    template(templateOptions)
  ]);
  return branchAndMerge(mergeWith(templateSource))(tree, context);
}
