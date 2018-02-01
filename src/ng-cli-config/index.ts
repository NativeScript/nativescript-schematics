import {
  apply,
  branchAndMerge,
  move,
  template,
  url,
  mergeWith,
  TemplateOptions,
} from '@angular-devkit/schematics';

import { Schema as NgCliConfigSchema } from './schema';

export default function (options: NgCliConfigSchema) {
  return branchAndMerge(mergeWith(
    apply(url('./files'), [
      template(<TemplateOptions>{
        sourcedir: options.sourceDir,
        style: options.style,
        dot: ".",
      }),
      move(options.path),
    ])
  ))
}