import {
  apply,
  branchAndMerge,
  move,
  template,
  url,
  mergeWith,
  noop,
} from '@angular-devkit/schematics';

import { Schema as NgCliConfigSchema } from './schema';

export default function(options: NgCliConfigSchema) {
  return branchAndMerge(mergeWith(
    apply(url('./_files'), [
      template({ ...options }),
      (options.path) ? move(options.path) : noop,
    ]),
  ));
}
