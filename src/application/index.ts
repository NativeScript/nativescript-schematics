import {
  apply,
  chain,
  url,
  move,
  template,
  mergeWith,
  TemplateOptions,
  schematic,
} from '@angular-devkit/schematics';
import { stringUtils } from '../utils';

export default function (options: any) {
  const appPath = options.name || '.';
  const sourcedir = options.sourceDir || 'app';

  return chain([
    mergeWith(
      apply(url('./files'), [
        template(<TemplateOptions>{
          utils: stringUtils,
          sourcedir,
          dot: '.',
          ...options as any,
        }),
        move(appPath),
      ]),
    ),
    schematic('app-resources', {
      path: `${appPath}/${sourcedir}`,
    }),
  ])
}
