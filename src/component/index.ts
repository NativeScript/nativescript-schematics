import {
  Rule,
  SchematicsException,
  VirtualTree,
  apply,
  chain,
  externalSchematic,
  template,
  url,
  move,
  branchAndMerge,
  mergeWith,
  TemplateOptions,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { dasherize } from '@schematics/angular/strings';

import {
  addSymbolToComponentMetadata,
  deleteFiles,
  getSourceFile,
  removeSpecFiles,
} from "../utils";
import { Schema as ComponentOptions } from './schema';

export default function (options: ComponentOptions): Rule {
  const { name } = options;
  const prefix = `/${name}.component`;

  return chain([
    externalSchematic('@schematics/angular', 'component', options),
    removeSpecFiles(prefix),
    removeHtmlFiles(prefix),
    insertModuleId(prefix),
    addFiles(options),
  ]);
}

const removeHtmlFiles = (prefix: string) =>
  (tree: VirtualTree) => deleteFiles(tree, `${prefix}.html`);

const insertModuleId = (name: string) =>
  (tree: VirtualTree) => {
    const component = tree.files
      .find(f => f.endsWith(`${name}.ts`)) as string;
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