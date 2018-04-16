import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  externalSchematic,
  template,
  url,
  move,
  branchAndMerge,
  mergeWith,
  TemplateOptions,
  filter,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';

import {
  Extensions,
  getSourceFile,
  ns,
  web,
  getExtensions,
  removeNsSchemaOptions,
} from "../utils";
import { addSymbolToComponentMetadata, insertModuleId } from "../ast-utils";
import { Schema as ComponentOptions } from './schema';
import { Path, normalize } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';

let extensions: Extensions;
export default function (options: ComponentOptions): Rule {
  let { name, sourceDir, path, flat } = options;
  name = dasherize(name);
  const dest = normalize(
    `/${sourceDir}/${path}/`
    + (flat ? '' : name + '/')
  );
  const componentPath = normalize(`${dest}/${name}.component.ts`);
  const templatePath = normalize(`${dest}/${name}.component.html`);

  return chain([
    externalSchematic('@schematics/angular', 'component', removeNsSchemaOptions(options)),
    validateOptions(options),

    (tree: Tree) => {
      extensions = getExtensions(tree, options);
    },

    (tree: Tree, context: SchematicContext) => web(tree, options) ?
      renameWebTemplate(templatePath)(tree) :
      removeWebTemplate(templatePath)(tree, context),

    (tree: Tree, context: SchematicContext) => ns(tree, options) ?
      performNsModifications(options, componentPath)(tree, context) :
      tree,
  ]);
};

const validateOptions = (options: ComponentOptions) =>
  (tree: Tree) => {
    const isWeb = web(tree, options);
    const isNs = ns(tree, options);
    if (!isWeb && !isNs) {
      throw new SchematicsException('You need to specify project type!');
    }

    if (isWeb && isNs && options.inlineTemplate) {
      throw new SchematicsException('You cannot use the --inlineTemplate option for web+ns component!');
    }
  };

const renameWebTemplate = (path: string) =>
  (tree: Tree) => {
    const webName = path.replace(".html", `${extensions.web}.html`);
    tree.rename(path, webName);

    return tree;
  };

const removeWebTemplate = (templatePath: string | RegExp) =>
  (tree: Tree, context: SchematicContext) =>
    filter((path: Path) => !path.match(templatePath))(tree, context)

const performNsModifications = (options: ComponentOptions, componentPath: string) =>
  (tree: Tree, context: SchematicContext) => {
    insertModuleId(componentPath)(tree);
    return addNativeScriptFiles(options)(tree, context);
  }


const addNativeScriptFiles = (options: ComponentOptions) => {
  const sourceDir = options.sourceDir;
  if (!sourceDir) {
    throw new SchematicsException(`sourceDir option is required.`);
  }

  const templateSource = apply(url('./_files'), [
    template(<TemplateOptions>{
      dasherize,
      'if-flat': (s: string) => options.flat ? '' : s,
      ...options as object,
      nsext: extensions.ns,
    }),
    move(sourceDir),
  ]);

  return branchAndMerge(
    mergeWith(templateSource),
  );
};
