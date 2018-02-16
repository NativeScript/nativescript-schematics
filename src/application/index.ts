import {
  apply,
  chain,
  url,
  move,
  template,
  mergeWith,
  TemplateOptions,
  schematic,
  noop,
} from '@angular-devkit/schematics';

import { stringUtils } from '../utils';
import { Schema as ApplicationOptions } from './schema';

export default function (options: ApplicationOptions) {
  const appPath = options.name;
  const sourcedir = options.sourceDir;
  const routing = options.routing && !options.minimal;

  return chain([
    mergeWith(
      apply(url('./_files'), [
        template(<TemplateOptions>{
          ...options as any,
          utils: stringUtils,
          routing,
          sourcedir,
          dot: '.',
        }),
        move(appPath),
      ]),
    ),

    routing ?
      mergeWith(
        apply(url('./_routing-files'), [
          template(<TemplateOptions>{
            ...options as any,
            utils: stringUtils,
            routing,
            sourcedir,
            dot: '.',
          }),
          move(appPath),
        ]),
      ) :
      noop(),

    schematic('ng-cli-config', {
      path: appPath,
      style: options.style,
      sourceDir: options.sourceDir,
    }),
    schematic('app-resources', {
      path: `${appPath}/${sourcedir}`,
    }),
    schematic('styling', {
      appPath,
      sourceDir: sourcedir,
      extension: options.style,
      theme: options.theme,
    }),
  ])
}
