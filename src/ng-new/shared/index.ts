import { join } from 'path';
import {
  Rule,
  chain,
  mergeWith,
  apply,
  url,
  template,
  move,
  schematic,
  noop,
} from '@angular-devkit/schematics';
import { TemplateOptions } from '@angular-devkit/core';

import { stringUtils } from '../../utils';

import { Schema as SharedOptions } from './schema';
import { Schema as AppResourcesOptions } from '../../app-resources/schema';
import { Schema as StylingOptions } from '../../styling/schema';

export default function(options: SharedOptions): Rule {
  const templateOptions = getTemplateOptions(options);

  return chain([
    mergeWith(
      apply(url('./_files'), [
        template(templateOptions),
        move(options.name),
      ]),
    ),

    options.sample ? 
      mergeWith(
        apply(url('./_sample-files'), [
          template(templateOptions),
          move(join(options.name, options.sourceDir, 'app')),
        ]),
      ) : noop(),

    runAppResourcesSchematic({
      path: options.name
    }),

    runStylingSchematic({
      appPath: options.name,
      sourceDir: options.sourceDir,
      extension: options.style,
      theme: options.theme,
    })
  ])
}

const getTemplateOptions = (options: SharedOptions) =>
  <TemplateOptions>{
    utils: stringUtils,
    name: options.name,
    sourcedir: options.sourceDir,
    prefix: options.prefix,
    dot: '.',
    theme: options.theme,
    style: options.style,
    sample: options.sample,
  };

const runAppResourcesSchematic = (options: AppResourcesOptions): Rule =>
  schematic('app-resources', options);

const runStylingSchematic = (options: StylingOptions): Rule =>
  schematic('styling', options);
