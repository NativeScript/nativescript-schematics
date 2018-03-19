import { Tree } from '@angular-devkit/schematics';

export function findMissingJsonProperties(to: Object, from: Object, resolveConflict = (_key: string) => { }) {
  if (!to) {
    return from;
  }
  const result = {};
  for (let key in from) {
    if (!to[key]) {
      result[key] = from[key];
    }
    else if (to[key] !== from[key]) {
      resolveConflict(key);
    }
  }
  return result;
}

export function getFileContents(tree: Tree, filePath: string) {
  const buffer = tree.read(filePath) || '';
  return buffer.toString();
}

/**
* Example: source: abc.123.def , text: -x-, where: .123 => abc-x-.123.def
*/
export function insertTextWhere(source: string, text: string, where: string) {
  const index = source.indexOf(where);
  return source.substring(0, index) + text + source.substring(index);
}

export interface FromTo {
  from: string,
  to: string
}

export const renameFiles = (paths: FromTo[]) => 
  (tree: Tree) => paths.forEach(({ from, to }) => tree.rename(from, to));

export const renameFilesForce = (paths) => 
  (tree: Tree) => paths.forEach(({ from, to }) => {
    const content = getFileContents(tree, from);
    tree.create(to, content);

    tree.delete(from);
  });
