import {
  Rule,
  // SchematicContext,
  // Tree,
  chain,
  mergeWith,
  apply,
  url,
  template,
  move,
  TemplateOptions,
  schematic
} from '@angular-devkit/schematics';

import { Schema as SharedOptions } from './schema';
import { Schema as AppResourcesOptions } from '../../app-resources/schema';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function(options: SharedOptions): Rule {
  return chain([
    createProject(options),
    runAppResourcesSchematic({
      path: options.name
    }),
  ])
}

const createProject = (options: SharedOptions) => 
  mergeWith(
    apply(url('./_files'), [
      template(<TemplateOptions>{
        name: options.name,
        sourcedir: options.sourceDir,
        prefix: options.prefix,
        dot: '.',
      }),
      move(options.name),
    ]),
  )

const runAppResourcesSchematic = (options: AppResourcesOptions): Rule =>
  schematic('app-resources', options)

