import {
  apply,
  chain,
  url,
  move,
  template,
  mergeWith,
  TemplateOptions,
  schematic,
} from '@angular-devkit/schematics';

import { stringUtils } from '../utils';
import { Schema as ApplicationOptions } from './schema';

export default function (options: ApplicationOptions) {
  const appPath = options.name || '.';
  const sourcedir = options.sourceDir || 'app';
  const appRootSelector = `${options.prefix}-root`;

  return chain([
    mergeWith(
      apply(url('./files'), [
        template(<TemplateOptions>{
          utils: stringUtils,
          sourcedir,
          dot: '.',
          appRootSelector,
          ...options as any,
        }),
        move(appPath),
      ]),
    ),
    schematic('app-resources', {
      path: `${appPath}/${sourcedir}`,
    }),
  ])
}
