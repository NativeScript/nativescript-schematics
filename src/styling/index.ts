import {
  apply,
  chain,
  url,
  move,
  template,
  mergeWith,
  TemplateOptions,
  Tree,
  noop,
} from '@angular-devkit/schematics';

import { Schema as StylingOptions } from './schema';
import { addDependency, NodeDependency } from '../utils';

const extensionFilesMap = {
  css: "_css-files",
  scss: "_scss-files",
};

export default function (options: StylingOptions) {
  const files = extensionFilesMap[options.extension];

  return chain([
    mergeWith(
      apply(url(files), [
        template(<TemplateOptions>{
          ...options as any,
        }),
        move(`${options.appPath}/${options.sourceDir}`)
      ]),
    ),
    options.extension === "scss" ?
      (tree: Tree) => {
        const sassDependency: NodeDependency = {
          name: "sass-loader",
          version: "~6.0.6",
          type: "devDependency",
        };

        addDependency(tree, sassDependency, options.appPath);
      } :
      noop()
  ]);
}
