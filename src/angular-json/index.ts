import {
  apply,
  branchAndMerge,
  move,
  template,
  url,
  mergeWith,
  noop,
} from '@angular-devkit/schematics';
import { TemplateOptions } from '@angular-devkit/core';

import { Schema as NgCliConfigSchema } from './schema';

export default function (options: NgCliConfigSchema) {
  return branchAndMerge(mergeWith(
    apply(url('./_files'), [
      template(<TemplateOptions>{ ...options }),
      (options.path) ? move(options.path) : noop
    ])
  ));
}