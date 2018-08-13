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
      template(<TemplateOptions>{
        prefix: options.prefix,
        name: options.name
      }),
      (options.path) ? move(options.path) : noop
    ])
  ));
}