import { relative, join } from 'path';

import {
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';
import { strings as angularStringUtils } from '@angular-devkit/core';
import * as ts from 'typescript';
import { NsConfig } from './models/nsconfig';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createAppModule } from '@schematics/angular/utility/test';
import { HostTree } from '@angular-devkit/schematics';

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
  const url = join(workingDirectory, 'package.json');

  return getJsonFile(tree, url);
}

export const overwritePackageJson = (tree: Tree, content: PackageJson, workingDirectory: string = '') => {
  const url = join(workingDirectory, 'package.json');
  
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
  } catch(e) {
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

export function createEmptyNsOnlyProject(projectName: string): UnitTestTree {
  let appTree = new UnitTestTree(new HostTree);

  const modulePath = `/src/app/app.module.ts`;

  appTree = createAppModule(<any>appTree, modulePath);

  appTree.create('/package.json', JSON.stringify({
    nativescript: { id: "proj" }
  }));

  appTree.create('/angular.json', JSON.stringify({
    projects: {
      [projectName]: {
        "root": "",
        "sourceRoot": "src",
        "projectType": "application",
        "prefix": "app"
      }
    }
  }));

  return appTree;
}

export function createEmptySharedProject(projectName: string): UnitTestTree {
  let appTree = createEmptyNsOnlyProject(projectName);

  appTree.create('/nsconfig.json', JSON.stringify({
    "appResourcesPath": "App_Resources",
    "appPath": "src",
    "nsext": ".tns",
    "webext": "",
    "shared": true
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
  if(relativePath.startsWith('../../')) {
    relativePath = relativePath.replace('../../', '../');
  } else if(relativePath.startsWith('../')) {
    relativePath = relativePath.replace('../', './');
  } else if (relativePath === '') {
    relativePath = './';
  }

  return relativePath.replace(/.ts$/, '');
}
