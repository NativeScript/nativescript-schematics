import {
  apply,
  branchAndMerge,
  move,
  template,
  url,
  mergeWith,
  TemplateOptions,
  noop,
} from '@angular-devkit/schematics';

import { Schema as NgCliConfigSchema } from './schema';

export default function (options: NgCliConfigSchema) {
  return branchAndMerge(mergeWith(
    apply(url('./_files'), [
      template(<TemplateOptions>{ ...options }),
      (options.path) ? move(options.path) : noop
    ])
  ));
}