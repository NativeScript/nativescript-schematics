import {
  SchematicContext,
  Tree,
  mergeWith,
  apply,
  url,
  template,
  move,
  chain,
  noop,
  schematic,
} from '@angular-devkit/schematics';
import { dasherize, classify } from '@angular-devkit/core/src/utils/strings';

import { Schema as MasterDetailSchema } from './schema';
import { getNsConfig } from '../../utils';
import { join } from 'path';
import { Schema as ConvertRelativeImportsSchema } from '../../convert-relative-imports/schema';

let projectParams: ProjectInfo;

export default function (options: MasterDetailSchema) {
  return chain([
    (tree: Tree) => {
      projectParams = getProjectInfo(tree);
    },

    generateTemplate(options),
    
    () => {
      if (projectParams.shared) {
        return schematic<ConvertRelativeImportsSchema>('convert-relative-imports', options);
      } else {
        return noop();
      }
    },
  ]);
}

const generateTemplate = (options: MasterDetailSchema) => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Generating Master Detail template');


  context.logger.info(`Project Params: ${JSON.stringify(projectParams, null, 2)}`);

  const templateOptions = {
    prefix: 'app', //options.prefix,
    name: dasherize(options.master),
    master: dasherize(options.master),
    detail: dasherize(options.detail),
    masterClassName: classify(options.master),
    detailClassName: classify(options.detail),
    nsext: projectParams.nsext
  };

  const templatePath = projectParams.shared ? './_files-shared' : './_files-nsonly';

  const templateSource = apply(
    url(templatePath), [
      template(templateOptions),
      move(projectParams.appPath)
    ]);
  return mergeWith(templateSource);
}

interface ProjectInfo {
  shared: boolean;
  appPath: string;
  nsext: string;
}
const getProjectInfo = (tree: Tree): ProjectInfo => {
  if (tree.exists('nsconfig.json')) {
    const nsconfig = getNsConfig(tree);
    return {
      shared: nsconfig.shared,
      appPath: join(nsconfig.appPath, 'app'),
      nsext: nsconfig.nsext
    }
  }

  return {
    shared: false,
    appPath: 'app',
    nsext: ''
  }
}
