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

import { Schema as AppResourcesSchema } from './schema';


export default function (options: AppResourcesSchema) {
  return branchAndMerge(mergeWith(
    apply(url('./_files'), [
      template(<TemplateOptions>{
        name: options.name
      }),
      // move to path, if one provided, otherwise skip
      (options.path) ? move(options.path) : noop
    ])
  ))
}
