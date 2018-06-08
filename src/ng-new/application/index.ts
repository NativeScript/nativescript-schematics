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
  Rule,
} from '@angular-devkit/schematics';

import { stringUtils } from '../../utils';
import { Schema as ApplicationOptions } from './schema';

import { Schema as AngularJsonOptions } from '../../angular-json/schema';
import { Schema as AppResourcesOptions } from '../../app-resources/schema';
import { Schema as StylingOptions } from '../../styling/schema';

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


    runAngularJsonSchematic({
      path: options.name,
      name: options.name,
      prefix: options.prefix
    }),

    runAppResourcesSchematic({
      path: `${appPath}/${sourcedir}`,
    }),

    runStylingSchematic({
      appPath,
      sourceDir: sourcedir,
      extension: options.style,
      theme: options.theme,
    })
  ])
}

const runAngularJsonSchematic = (options: AngularJsonOptions): Rule =>
  schematic('angular-json', options)

const runAppResourcesSchematic = (options: AppResourcesOptions): Rule =>
  schematic('app-resources', options)

const runStylingSchematic = (options: StylingOptions): Rule =>
  schematic('styling', options)
