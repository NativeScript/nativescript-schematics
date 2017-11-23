import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  externalSchematic,
} from '@angular-devkit/schematics';

import { Schema as ComponentOptions } from './schema';

export default function(options: ComponentOptions): Rule {
    return chain([
        externalSchematic('@schematics/angular', 'component', options),
        (tree: Tree, _context: SchematicContext) => {
            console.log("abrakadbra");
            return tree;
        }
    ])
}
