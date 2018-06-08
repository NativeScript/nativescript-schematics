import { 
  Rule,
  Tree,
  chain,
  schematic
} from '@angular-devkit/schematics';

import { Schema as ApplicationOptions } from './application/schema';
import { Schema as SharedOptions } from './shared/schema';
import { Schema as NgNewOptions } from './schema';

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
    }
  ]);
}

const parseToSharedOptions = (options: NgNewOptions): SharedOptions => {
  return {
    name: options.name
  };
}

const parseToApplicationOptions = (options: NgNewOptions): ApplicationOptions => {
  return {
    name: options.name,

    minimal: options.minimal,
    prefix: options.prefix,
    routing: options.routing,
    sourceDir: options.sourceDir,
    style: options.style,
    theme: options.theme
  };
}
