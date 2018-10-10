import { dirname } from 'path';

import { Tree, DirEntry } from "@angular-devkit/schematics";
import { join, normalize } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';

import { Schema as ComponentOptions } from './schema';

export function findModule(tree: Tree, options: ComponentOptions, path: string, extension: string) {
  if (options.module) {
    return findExplicitModule(tree, path, extension, options.module);
  } else {
    const pathToCheck = (path || '')
      + (options.flat ? '' : '/' + dasherize(options.name));

    return findImplicitModule(tree, pathToCheck, extension);
  }
}

function findExplicitModule(tree: Tree, path: string, extension: string, moduleName: string) {
  while (path && path !== '/') {
    const modulePath = normalize(`/${path}/${moduleName}`);
    const moduleBaseName = normalize(modulePath).split('/').pop();

    if (tree.exists(modulePath)) {
      return normalize(modulePath);
    } else if (tree.exists(modulePath + extension + '.ts')) {
      return normalize(modulePath + extension + '.ts');
    } else if (tree.exists(modulePath + '.module' + extension + '.ts')) {
      return normalize(modulePath + '.module' + extension + '.ts');
    } else if (tree.exists(modulePath + '/' + moduleBaseName + '.module' + extension + '.ts')) {
      return normalize(modulePath + '/' + moduleBaseName + '.module' + extension + '.ts');
    }

    path = dirname(path);
  }

  throw new Error('Specified module does not exist');
}

function findImplicitModule(tree: Tree, path: string, extension: string) {
    let dir: DirEntry | null = tree.getDir(`/${path}`);

    const moduleRe = new RegExp(`.module${extension}.ts`);
    const routingModuleRe = new RegExp(`-routing.module${extension}.ts`);

    while (dir && dir.path && dir.path !== '/') {
      const matches = dir.subfiles.filter(p => moduleRe.test(p) && !routingModuleRe.test(p));
      if (matches.length == 1) {
        return join(dir.path, matches[0]);
      } else if (matches.length > 1) {
        throw new Error('More than one module matches. Use skip-import option to skip importing '
          + 'the component into the closest module.');
      }

      dir = dir.parent;
    }
    throw new Error('Could not find an NgModule. Use the skip-import '
      + 'option to skip importing in NgModule.');
}
