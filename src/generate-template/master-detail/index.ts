import {
  SchematicContext,
  Tree,
  mergeWith,
  apply,
  url,
  template,
  move,
} from '@angular-devkit/schematics';

import { Schema as MasterDetailSchema } from './schema';
import { dasherize, classify } from '@angular-devkit/core/src/utils/strings';
import { getNsConfig } from '../../utils';
import { join } from 'path';

export default function (options: MasterDetailSchema) {
  return generateTemplate(options);
}


const generateTemplate = (options: MasterDetailSchema) => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Generating Master Detail template');
  const projectParams = getProjectInfo(tree);

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
    url(templatePath),[
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
  if(tree.exists('nsconfig.json')) {
    const nsconfig = getNsConfig(tree);
    return {
      shared: true,
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
