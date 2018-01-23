import {
  apply,
  branchAndMerge,
  move,
  template,
  url,
  mergeWith,
  TemplateOptions,
} from '@angular-devkit/schematics';

import { Schema as AppResourcesSchema } from './schema';

export default function (options: AppResourcesSchema) {
  return branchAndMerge(mergeWith(
    apply(url('./files'), [
      template(<TemplateOptions>{
        name: options.name
      }),
      move(options.path),
    ])
  ))
}