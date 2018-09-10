import { relative, join } from 'path';

import {
  SchematicsException,
  Tree,
  Rule,
  move,
} from '@angular-devkit/schematics';
import { strings as angularStringUtils } from '@angular-devkit/core';
import * as ts from 'typescript';
import { NsConfig } from './models/nsconfig';
import { UnitTestTree, SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createAppModule } from '@schematics/angular/utility/test';

const PACKAGE_JSON = 'package.json';

export interface Node {
  getStart();
  getFullStart();
  getEnd();
}

export interface FromTo {
  from: string,
  to: string
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
  type: 'dependency' | 'devDependency'
}

export const schematicRunner = new SchematicTestRunner(
  'nativescript-schematics',
  join(__dirname, 'collection.json'),
);

export const getSourceFile = (host: Tree, path: string): ts.SourceFile => {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(`Could not find bootstrapped module.`);
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

export const removeNode = (node: Node, filePath: string, tree: Tree) => {
  const recorder = tree.beginUpdate(filePath);

  const start = node.getFullStart();
  const end = node.getEnd();
  recorder.remove(start, end - start);
  tree.commitUpdate(recorder);
}

export const copy = (tree: Tree, from: string, to: string) => {
  const file = tree.get(from);
  if (!file) {
    throw new Error(`File ${from} does not exist!`);
  }

  tree.create(to, file.content);
}

export const addDependency = (tree: Tree, dependency: NodeDependency, packageJsonDir?: string) => {
  const path = packageJsonDir ?
    `${packageJsonDir}/package.json` :
    'package.json';

  const packageJson: any = getJsonFile(tree, path);

  if (dependency.type === 'dependency') {
    const dependenciesMap = Object.assign({}, packageJson.dependecies);
    packageJson.dependecies = setDependency(dependenciesMap, dependency);
  } else {
    const dependenciesMap = Object.assign({}, packageJson.devDependencies);
    packageJson.devDependencies = setDependency(dependenciesMap, dependency);
  }

  tree.overwrite(path, JSON.stringify(packageJson, null, 2));
};

const setDependency = (
  dependenciesMap: { [key: string]: string },
  { name, version }: NodeDependency
) => Object.assign(dependenciesMap, { [name]: version });

export const getPackageJson = (tree: Tree, workingDirectory: string = ''): PackageJson => {
  const url = join(workingDirectory, PACKAGE_JSON);

  return getJsonFile(tree, url);
}

export const overwritePackageJson = (tree: Tree, content: PackageJson, workingDirectory: string = '') => {
  const url = join(workingDirectory, PACKAGE_JSON);

  tree.overwrite(url, JSON.stringify(content, null, 2));
}

export interface PackageJson {
  dependencies: Object;
  devDependencies: Object;
  name?: string;
  version?: string;
  license?: string;
  scripts?: Object;
  nativescript?: string
}

export const getJsonFile = <T>(tree: Tree, path: string): T => {
  const file = tree.get(path);
  if (!file) {
    throw new FileNotFoundException(path);
  }

  try {
    const content = JSON.parse(file.content.toString());
    return content as T;
  } catch (e) {
    throw new SchematicsException(`File ${path} could not be parsed!`);
  }
};

export const getNsConfig = (tree: Tree): NsConfig => {
  return getJsonFile<NsConfig>(tree, '/nsconfig.json');
}

export const getAngularJson = (tree: Tree): any => {
  return getJsonFile<any>(tree, '/angular.json');
}

export const getFileContents = (tree: Tree, filePath: string): string => {
  const buffer = tree.read(filePath) || '';
  return buffer.toString();
}

export const renameFiles = (paths: FromTo[]) =>
  (tree: Tree) => paths.forEach(({ from, to }) => tree.rename(from, to));

export const renameFilesForce = (paths: FromTo[]) =>
  (tree: Tree) => paths.forEach(({ from, to }) => {
    const content = getFileContents(tree, from);
    tree.create(to, content);

    tree.delete(from);
  });

export function createEmptyNsOnlyProject(projectName: string, extension: string = ''): UnitTestTree {
  let appTree = schematicRunner.runSchematic('angular-json', { name: projectName, sourceRoot: 'src' });

  appTree = createAppModule(<any>appTree, `/src/app/app.module${extension}.ts`);

  appTree.create('/package.json', JSON.stringify({
    nativescript: { id: 'proj' },
    dependencies: {
      '@angular/core': '^6.1.0'
    },
    devDependencies: {
      '@angular/cli': '^6.2.0'
    },
  }));

  return appTree;
}

export function createEmptySharedProject(projectName: string, webExtension: string = '', nsExtension: string = '.tns'): UnitTestTree {
  let appTree = createEmptyNsOnlyProject(projectName, nsExtension);
  appTree = createAppModule(<any>appTree, `/src/app/app.module${webExtension}.ts`);

  appTree.create('/nsconfig.json', JSON.stringify({
    'appResourcesPath': 'App_Resources',
    'appPath': 'src',
    'nsext': '.tns',
    'webext': '',
    'shared': true
  }));

  return appTree;
}

/**
 * Sanitizes a given string by removing all characters that
 * are not letters or digits.
 *
 ```javascript
 sanitize('nativescript-app');  // 'nativescriptapp'
 sanitize('action_name');       // 'actioname'
 sanitize('css-class-name');    // 'cssclassname'
 sanitize('my favorite items'); // 'myfavoriteitems'
 ```

 @method sanitize
 @param {String} str The string to sanitize.
 @return {String} the sanitized string.
*/
export const sanitize = (str: string): string => str
  .split('')
  .filter(char => /[a-zA-Z0-9]/.test(char))
  .join('');

export const stringUtils = { ...angularStringUtils, sanitize };

export const toComponentClassName = (name: string) =>
  `${stringUtils.classify(name)}Component`;

export const toNgModuleClassName = (name: string) =>
  `${stringUtils.classify(name)}Module`;

export const findMissingJsonProperties = (to: Object, from: Object, resolveConflict = (_key: string) => { }) => {
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

/**
* Example: source: abc.123.def , text: -x-, where: .123 => abc-x-.123.def
*/
export const insertTextWhere = (source: string, text: string, where: string) => {
  const index = source.indexOf(where);
  return source.substring(0, index) + text + source.substring(index);
}

export const addExtension = (path: string, extension: string) => {
  const index = path.lastIndexOf('.');
  const newPath = path.slice(0, index) + extension + path.slice(index);
  return newPath;
}

/**
 * Find relative path, and remove .tns (to make it an import path)
 * @param from path to the importing file
 * @param to path to the imported file
 */
export const findRelativeImportPath = (from, to): string => {
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
}

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
  schematicRunner.callRule(rule, tree).subscribe(tree => newTree = tree);
  if (newTree === undefined) {
    throw new SchematicsException('The provided rule is asyncronous! Use with `callRule` instead!');
  }

  return newTree;
}
