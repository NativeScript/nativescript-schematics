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
import { addBootstrapToNgModule } from '../ast-utils';

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
    schematic('module', {
      name: 'app',
      nativescript: true,
      commonModule: false,
      flat: true,
      routing: options.routing,
      routingScope: 'Root',
      path: '.',
      sourceDir: `${appPath}/${sourcedir}`,
      spec: false,
      nsExtension: ''
    }),
    addBootstrapToNgModule(`${appPath}/${sourcedir}/app.module.ts`),
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
