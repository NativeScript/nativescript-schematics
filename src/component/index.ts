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
import { dasherize } from '@schematics/angular/strings';

import {
  Extensions,
  addSymbolToComponentMetadata,
  getSourceFile,
  ns,
  web,
  getExtensions,
  removeNsSchemaOptions,
} from "../utils";
import { Schema as ComponentOptions } from './schema';
import { Path, normalize } from '@angular-devkit/core';

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
      extensions = getExtensions(tree);
      return tree;
    },

    (tree: Tree, context: SchematicContext) => web(tree, options) ?
      templateToWeb(templatePath)(tree) :
      filter((path: Path) => !path.match(templatePath))(tree, context),

    (tree: Tree) => ns(tree, options) ?
      insertModuleId(componentPath)(tree) :
      tree,

    (tree: Tree, context: SchematicContext) => ns(tree, options) ?
      addFiles(options)(tree, context) :
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

const templateToWeb = (path: string) =>
  (tree: Tree) => {
    const webName = path.replace(".html", `${extensions.web}.html`);
    tree.rename(path, webName);
  };

const insertModuleId = (component: string) =>
  (tree: Tree) => {
    const componentSource = getSourceFile(tree, component);
    const recorder = tree.beginUpdate(component);

    const metadataChange = addSymbolToComponentMetadata(
      componentSource, component, 'moduleId', 'module.id');

    metadataChange.forEach((change: InsertChange) =>
      recorder.insertRight(change.pos, change.toAdd)
    );
    tree.commitUpdate(recorder);

    return tree;
  };

const addFiles = (options: ComponentOptions) => {
  const sourceDir = options.sourceDir;
  if (!sourceDir) {
    throw new SchematicsException(`sourceDir option is required.`);
  }

  const templateSource = apply(url('./files'), [
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
