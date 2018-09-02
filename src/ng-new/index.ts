import { 
  Rule,
  Tree,
  chain,
  schematic,
  SchematicContext
} from '@angular-devkit/schematics';

import { Schema as ApplicationOptions } from './application/schema';
import { Schema as SharedOptions } from './shared/schema';
import { Schema as NgNewOptions } from './schema';
import {
  NodePackageInstallTask,
  RepositoryInitializerTask,
} from '@angular-devkit/schematics/tasks';

export default function(options: NgNewOptions): Rule {
  return chain([
    () => {
      if (options.shared) {
        const sharedOptions: SharedOptions = parseToSharedOptions(options);
        return schematic('shared', sharedOptions);
      } else {
        const applicationOptions: ApplicationOptions = parseToApplicationOptions(options);
        return schematic('application', applicationOptions)
      }
    },
    (_tree: Tree, context: SchematicContext) => {
      const packageTask = context.addTask(new NodePackageInstallTask(options.name));

      const dependencies = [packageTask];
      context.addTask(new RepositoryInitializerTask(options.name, {}), dependencies);
    },
  ]);
}

const parseToSharedOptions = (options: NgNewOptions): SharedOptions => {
  return {
    name: options.name,
    sourceDir: options.sourceDir || 'src',
    prefix: options.prefix,
    style: options.style,
    theme: options.theme,
    sample: options.sample,
  };
}

const parseToApplicationOptions = (options: NgNewOptions): ApplicationOptions => {
  return {
    name: options.name,

    prefix: options.prefix,
    sourceDir: options.sourceDir || 'app',
    style: options.style,
    theme: options.theme,
    webpack: options.webpack,
  };
}
