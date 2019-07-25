import {
  apply,
  chain,
  url,
  move,
  template,
  mergeWith,
  Tree,
  noop,
} from '@angular-devkit/schematics';

import { Schema as StylingOptions } from './schema';
import { addDependency, NodeDependency } from '../utils';

const extensionFilesMap = {
  css: '_css-files',
  scss: '_scss-files',
};

export default function(options: StylingOptions) {
  const files = extensionFilesMap[options.extension];

  return chain([
    mergeWith(
      apply(url(files), [
        template({ ...options }),
        move(`${options.appPath}/${options.sourceDir}`),
      ]),
    ),
    options.extension === 'scss' ?
      (tree: Tree) => {
        const sassDependency: NodeDependency = {
          name: 'nativescript-dev-sass',
          version: '~1.6.0',
          type: 'devDependency',
        };

        addDependency(tree, sassDependency, options.appPath);
      } :
      noop(),
  ]);
}
