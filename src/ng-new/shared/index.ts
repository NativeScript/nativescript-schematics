import {
  Rule,
  chain,
  mergeWith,
  apply,
  url,
  template,
  move,
  TemplateOptions,
  schematic
} from '@angular-devkit/schematics';

import { stringUtils } from '../../utils';

import { Schema as SharedOptions } from './schema';
import { Schema as AppResourcesOptions } from '../../app-resources/schema';
import { Schema as StylingOptions } from '../../styling/schema';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function(options: SharedOptions): Rule {
  return chain([
    createProject(options),
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

const createProject = (options: SharedOptions) => 
  mergeWith(
    apply(url('./_files'), [
      template(<TemplateOptions>{
        utils: stringUtils,
        name: options.name,
        sourcedir: options.sourceDir,
        prefix: options.prefix,
        dot: '.',
        theme: options.theme,
        style: options.style,
      }),
      move(options.name),
    ]),
  )

const runAppResourcesSchematic = (options: AppResourcesOptions): Rule =>
  schematic('app-resources', options)

const runStylingSchematic = (options: StylingOptions): Rule =>
  schematic('styling', options)
