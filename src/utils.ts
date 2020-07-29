import { relative, join } from 'path';

import {
  SchematicsException,
  Tree,
  Rule,
  move,
} from '@angular-devkit/schematics';
import { strings as angularStringUtils } from '@angular-devkit/core';
import { NsConfig } from './models/nsconfig';
import { UnitTestTree, SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as stripJsonComments from 'strip-json-comments';

const PACKAGE_JSON = 'package.json';

export interface Node {
  getStart();
  getFullStart();
  getEnd();
}

export interface FromTo {
  from: string;
  to: string;
}

class FileNotFoundException extends Error {
  constructor(fileName: string) {
    const message = `File ${fileName} not found!`;
    super(message);
  }
}

export interface NodeDependency {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
}

export const removeNode = (node: Node, filePath: string, tree: Tree) => {
  const recorder = tree.beginUpdate(filePath);

  const start = node.getFullStart();
  const end = node.getEnd();
  recorder.remove(start, end - start);
  tree.commitUpdate(recorder);
};

export const copy = (tree: Tree, from: string, to: string) => {
  const file = tree.get(from);
  if (!file) {
    throw new Error(`File ${from} does not exist!`);
  }

  tree.create(to, file.content);
};

export const addDependency = (tree: Tree, dependency: NodeDependency, packageJsonDir?: string) => {
  const path = packageJsonDir ?
    `${packageJsonDir}/package.json` :
    'package.json';

  const packageJson: any = getJsonFile(tree, path);

  if (dependency.type === 'dependency') {
    const dependenciesMap = {...packageJson.dependecies};
    packageJson.dependecies = setDependency(dependenciesMap, dependency);
  } else {
    const dependenciesMap = {...packageJson.devDependencies};
    packageJson.devDependencies = setDependency(dependenciesMap, dependency);
  }

  tree.overwrite(path, JSON.stringify(packageJson, null, 2));
};

const setDependency = (
  dependenciesMap: { [key: string]: string },
  { name, version }: NodeDependency,
) => ({...dependenciesMap,  [name]: version});

export const getPackageJson = (tree: Tree, workingDirectory: string = ''): PackageJson => {
  const url = join(workingDirectory, PACKAGE_JSON);

  return getJsonFile(tree, url);
};

export const overwritePackageJson = (tree: Tree, content: PackageJson, workingDirectory: string = '') => {
  const url = join(workingDirectory, PACKAGE_JSON);

  tree.overwrite(url, JSON.stringify(content, null, 2));
};

export interface PackageJson {
  dependencies: object;
  devDependencies: object;
  name?: string;
  version?: string;
  license?: string;
  scripts?: object;
  nativescript?: string;
}

export const getJsonFile = <T>(tree: Tree, path: string): T => {
  const file = tree.get(path);
  if (!file) {
    throw new FileNotFoundException(path);
  }

  try {
    const content = JSON.parse(stripJsonComments(file.content.toString()));

    return content as T;
  } catch (e) {
    throw new SchematicsException(`File ${path} could not be parsed!`);
  }
};

export const getNsConfig = (tree: Tree): NsConfig => {
  return getJsonFile<NsConfig>(tree, '/nsconfig.json');
};

export const getFileContents = (tree: Tree, filePath: string): string => {
  const buffer = tree.read(filePath) || '';

  return buffer.toString();
};

export const renameFiles = (paths: Array<FromTo>) =>
  (tree: Tree) => paths.forEach(({ from, to }) => tree.rename(from, to));

export const renameFilesForce = (paths: Array<FromTo>) =>
  (tree: Tree) => paths.forEach(({ from, to }) => {
    const content = getFileContents(tree, from);
    tree.create(to, content);

    tree.delete(from);
  });

/**
 * Sanitizes a given string by removing all characters that
 * are not letters or digits.
 *
 * ```javascript
 * sanitize('nativescript-app');  // 'nativescriptapp'
 * sanitize('action_name');       // 'actioname'
 * sanitize('css-class-name');    // 'cssclassname'
 * sanitize('my favorite items'); // 'myfavoriteitems'
 * ```
 * @method sanitize
 * @param {String} str The string to sanitize.
 * @return {String} the sanitized string.
 */
export const sanitize = (str: string): string => str
  .split('')
  .filter((char) => /[a-zA-Z0-9]/.test(char))
  .join('');

export const stringUtils = { ...angularStringUtils, sanitize };

export const toComponentClassName = (name: string) =>
  `${stringUtils.classify(name)}Component`;

export const toNgModuleClassName = (name: string) =>
  `${stringUtils.classify(name)}Module`;

/**
 * Example: source: abc.123.def , text: -x-, where: .123 => abc-x-.123.def
 */
export const insertTextWhere = (source: string, text: string, where: string) => {
  const index = source.indexOf(where);

  return source.substring(0, index) + text + source.substring(index);
};

export const addExtension = (path: string, extension: string) => {
  const index = path.lastIndexOf('.');
  const newPath = path.slice(0, index) + extension + path.slice(index);

  return newPath;
};

/**
 * Find relative path, and remove .tns (to make it an import path)
 * @param from path to the importing file
 * @param to path to the imported file
 */
export const findRelativeImportPath = (from, to): string => {
  // Make sure that if one of the paths starts with '/', the other one does too
  const toStartsWithSlash = to.startsWith('/');
  const fromStartsWithSlash = from.startsWith('/');
  
  if (toStartsWithSlash && !fromStartsWithSlash) {
    from = '/' + from;
  } else if (!toStartsWithSlash && fromStartsWithSlash) {
    to = '/' + to;
  }

  let relativePath = relative(from, to);

  // if starts with ../../ then relative is going to skip one folder too many
  if (relativePath.startsWith('../../')) {
    relativePath = relativePath.replace('../../', '../');
  } else if (relativePath.startsWith('../')) {
    relativePath = relativePath.replace('../', './');
  } else if (relativePath === '') {
    relativePath = './';
  }

  return relativePath.replace(/.ts$/, '');
};

export function safeGet(object, ...properties) {
  if (properties.length === 0) {
    return object;
  }

  if (!object) {
    return;
  }

  const firstProperty = properties.shift();
  const value = object[firstProperty];
  if (!value) {
    return;
  }

  return safeGet(value, ...properties);
}

/**
 * Move the sources of a tree from a specified directory to the root.
 * Example: move the application of a project to root level,
 * so we can call schematics that depend on being executed inside a project.
 */
export const moveToRoot = <T extends Tree | UnitTestTree>(
  schematicRunner: SchematicTestRunner,
  tree: T,
  from: string,
): T => callRuleSync(schematicRunner, () => move(from, '.'), tree);

function callRuleSync<T extends Tree | UnitTestTree>(
  schematicRunner: SchematicTestRunner,
  rule: Rule,
  tree: T,
): T {

  let newTree;
  schematicRunner.callRule(rule, tree)
    .subscribe((t) => newTree = t);

  if (newTree === undefined) {
    throw new SchematicsException('The provided rule is async! Use with `callRule` instead!');
  }

  return newTree;
}
