import { Schema as ConvertRelativeImportsSchema } from './schema';
import { Tree } from '@angular-devkit/schematics';

export default function (_options: ConvertRelativeImportsSchema) {
  return (tree: Tree) => tree;
}

