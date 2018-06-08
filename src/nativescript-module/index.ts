import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  apply,
  url,
  template,
  branchAndMerge,
  mergeWith
} from '@angular-devkit/schematics';
import { getNsConfigExtension } from '../generate/utils';

import { Schema as NativeScriptModuleSchema } from './schema';
import { dasherize, classify } from '@angular-devkit/core/src/utils/strings';
import { join } from 'path';
import { AngularProjectSettings, getAngularProjectSettings } from '../angular-project-parser';

let nsext: string;
let projectSettings: AngularProjectSettings;

export default function(options: NativeScriptModuleSchema): Rule {

  return chain([
    (tree: Tree) => {
      const nsconfigExtensions = getNsConfigExtension(tree);
      nsext = options.nsext || nsconfigExtensions.ns;

      if (!nsext.startsWith('.')) {
        nsext = '.' + nsext;
      }
    },
    getProjectSettings,
    addNsFiles(options)
  ]);
}

const getProjectSettings = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Reading Project Settings');
  projectSettings = getAngularProjectSettings(tree);
};

const addNsFiles = (options: NativeScriptModuleSchema) => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding Module {N} file');
  const templateOptions = {
    path: join(projectSettings.sourceRoot, 'app'),
    name: options.name,

    'if-flat': (s: string) => options.flat ? '' : s,
    classify: classify,
    dasherize: dasherize,

    nsext: nsext
  };
  const templateSource = apply(url('./_files'), [
      template(templateOptions)
  ]);
  return branchAndMerge(mergeWith(templateSource))(tree, context);
};
