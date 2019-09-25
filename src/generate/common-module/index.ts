import {
  Rule,
  mergeWith,
  apply,
  url,
  template,
  move,
} from '@angular-devkit/schematics';

import { Schema as CommonModuleOptions } from './schema';

export default function(options: CommonModuleOptions): Rule {
  const { name, path } = options;

  return mergeWith(
    apply(url('./_files'), [
      template({ name }),
      move(path),
    ]),
  );
}
