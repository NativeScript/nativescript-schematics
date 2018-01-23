import {
  apply,
  url,
  move,
  template,
  branchAndMerge,
  mergeWith,
  TemplateOptions,
} from '@angular-devkit/schematics';
import * as stringUtils from '@schematics/angular/strings';

export default function (options: any) {
  console.log(options);
  return branchAndMerge(mergeWith(
    apply(url('./files'), [
      template(<TemplateOptions>{
        utils: stringUtils,
        sourcedir: options.sourceDir || 'app',
        dot: ".",
        ...options as any,
      }),
      move(options.name || '.'),
    ])
  ))
}
