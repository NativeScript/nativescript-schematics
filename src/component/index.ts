import {
  Rule,
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
  addSymbolToComponentMetadata,
  getSourceFile,
} from "../utils";
import { Schema as ComponentOptions } from './schema';
import { Path, normalize } from '@angular-devkit/core';

export default function (options: ComponentOptions): Rule {
  let { name, sourceDir, path, flat } = options;
  name = dasherize(name);
  const componentPath = normalize(
    `/${sourceDir}/${path}/`
    + (flat ? '' : name + '/')
    + name + '.component.ts'
  );

  return chain([
    externalSchematic('@schematics/angular', 'component', options),
    filter((path: Path) => !path.match(/\.spec\.ts$/)),
    filter((path: Path) => !path.match(/\.html$/)),
    insertModuleId(componentPath),
    addFiles(options),
  ]);
}

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
    }),
    move(sourceDir),
  ]);

  return branchAndMerge(chain([
    mergeWith(templateSource),
  ]));
};