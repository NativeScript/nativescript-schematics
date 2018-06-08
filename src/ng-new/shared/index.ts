import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

import { Schema as SharedOptions } from './schema';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function(options: SharedOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Shared project will be created in the next version: ' + options.name);
    return tree;
  };
}
