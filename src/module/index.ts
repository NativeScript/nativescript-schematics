import {
  Rule,
  SchematicsException,
  Tree,
  chain,
  externalSchematic,
  template,
  TemplateOptions,
  filter,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';

import { Schema as ModuleOptions } from './schema';
import { Path } from '@angular-devkit/core';

export default function (options: ModuleOptions): Rule {

  return chain([
    externalSchematic('@schematics/angular', 'module', options),
    filter((path: Path) => !path.match(/\.spec\.ts$/)),
  ]);
}
