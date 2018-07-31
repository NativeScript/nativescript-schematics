import { 
  Rule,
  Tree,
  chain,
  schematic
} from '@angular-devkit/schematics';

import { Schema as ApplicationOptions } from './application/schema';
import { Schema as SharedOptions } from './shared/schema';
import { Schema as NgNewOptions } from './schema';
import { Schema as NpmIstallOptions } from '../npm-install/schema';

export default function(options: NgNewOptions): Rule {
  return chain([
    (_tree: Tree) => {
      if (options.shared) {
        const sharedOptions: SharedOptions = parseToSharedOptions(options);
        return schematic('shared', sharedOptions);
      } else {
        const applicationOptions: ApplicationOptions = parseToApplicationOptions(options);
        return schematic('application', applicationOptions)
      }
    },
    () => {
      const npmInstallOptions: NpmIstallOptions = {
        workingDirectory: options.name
      };

      return schematic('npm-install', npmInstallOptions)
    }
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
