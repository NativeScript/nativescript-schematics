import { join } from 'path';

import {
  chain,
  Tree,
} from '@angular-devkit/schematics';
import { insertImport } from '../route-utils';

import { Schema } from './schema';
import { getJsonFile, getSourceFile, removeNode } from '../utils';
import {
  collectDeepNodes,
  filterByChildNode,
  findImports,
  getDecoratedClasses,
  getDecoratorMetadataFromClass,
  getNodesToRemoveFromNestedArray,
  getSymbolsToAddToObject,
  removeImport,
  getDecoratedClass,
} from '../ast-utils';

import * as ts from 'typescript';
import { SchematicsException } from '@angular-devkit/schematics/src/exception/exception';
import { InsertChange } from '@schematics/angular/utility/change';

export default function (options: Schema) {
  const { sourceDir } = options;

  return chain([
    (tree: Tree) => {
      const entry = getEntryModule(tree, sourceDir);
      const { rootModule, rootModulePath } = getBootstrappedModule(tree, entry, sourceDir);

      let animationModuleIsUsed = false;
      tree.visit(path => {
        if (
          path.startsWith('/node_modules') ||
          path.startsWith('/platforms') ||
          !path.endsWith('.ts') ||
          path === `/${rootModulePath}`
        ) {
          return;
        }

        const ngModules = getDecoratedClasses(tree, path, 'NgModule');
        const metadataObjects = ngModules
          .map(m => ({
            metadataObject: getDecoratorMetadataFromClass(m, 'NgModule') as ts.ObjectLiteralExpression,
            classNode: m,
          }))
          .filter(({ metadataObject }) => !!metadataObject);

        metadataObjects.forEach(({ metadataObject, classNode }) => {
          const nativeScriptModuleRemoved =
            removeImportedNgModule(tree, path, metadataObject, 'NativeScriptModule');
          if (nativeScriptModuleRemoved) {
            metadataObject = refetchMetadata(tree, path, classNode);
            importNgModule(tree, path, metadataObject, 'NativeScriptCommonModule', 'nativescript-angular/common');
          }

          metadataObject = refetchMetadata(tree, path, classNode);
          const animationsModuleRemoved = 
            removeImportedNgModule(tree, path, metadataObject, 'NativeScriptAnimationsModule');
          animationModuleIsUsed = animationModuleIsUsed || animationsModuleRemoved;
        });

        return true;
      });

      if (animationModuleIsUsed) {
        const rootModuleMetadata = getDecoratorMetadataFromClass(rootModule !, 'NgModule') as ts.ObjectLiteralExpression;
        importNgModule(
          tree,
          rootModulePath,
          rootModuleMetadata,
          'NativeScriptAnimationsModule',
          'nativescript-angular/animations'
        );
      }
    }
  ]);
}

const getEntryModule = (tree: Tree, sourceDir: string) => {
  const innerPackageJson = getJsonFile<any>(tree, `${sourceDir}/package.json`);
  const entry = innerPackageJson.main;
  const tsEntry = entry.replace(/\.js$/i, '.ts');

  return `${sourceDir}/${tsEntry}`;
};

const getBootstrappedModule = (tree: Tree, path: string, sourceDir: string) => {
  const entrySource = getSourceFile(tree, path);
  const bootstrappedModules = collectDeepNodes<ts.CallExpression>(entrySource, ts.SyntaxKind.CallExpression)
    .filter(node => filterByChildNode(node, (child: ts.Node) =>
        child.kind === ts.SyntaxKind.PropertyAccessExpression &&
        ['bootstrapModule', 'bootstrapModuleNgFactory'].includes(
          (<ts.PropertyAccessExpression>child).name.getFullText()
        )
      )
    )
    .map((node: ts.CallExpression) => node.arguments[0]);

  if (bootstrappedModules.length !== 1) {
    throw new SchematicsException(`You should have exactly one bootstrapped module inside ${path}!`);
  }

  const moduleName = bootstrappedModules[0].getText();
  const imports = findImports(moduleName, entrySource);
  const lastImport = imports[imports.length - 1];
  const moduleSpecifier = lastImport.moduleSpecifier.getText();
  const moduleRelativePath = `${moduleSpecifier.replace(/"|'/g, '')}.ts`;
  
  const rootModulePath = join(sourceDir, moduleRelativePath);
  const rootModule = getDecoratedClasses(tree, rootModulePath, 'NgModule')
    .find(c => !!(c.name && c.name.getText() === moduleName));

  return { rootModule, rootModulePath };
};

const refetchMetadata = (tree: Tree, path: string, classNode: ts.ClassDeclaration) => {
  const newClassNode = getDecoratedClass(tree, path, 'NgModule', classNode.name!.getText())!;
  const newMetadataObject = getDecoratorMetadataFromClass(newClassNode, 'NgModule') as ts.ObjectLiteralExpression;

  return newMetadataObject;
};

const importNgModule = (
  tree: Tree,
  path: string,
  metadataObject: ts.ObjectLiteralExpression,
  name: string,
  importPath: string
) => {
  const nodesToAdd = getSymbolsToAddToObject(path, metadataObject, 'imports', name);
  const recorder = tree.beginUpdate(path);
  nodesToAdd.forEach(change => {
    recorder.insertRight(change.pos, change.toAdd)
  });
  tree.commitUpdate(recorder);

  const source = getSourceFile(tree, path);
  const newImport = insertImport(source, path, name, importPath) as InsertChange;
  const importRecorder = tree.beginUpdate(path);
  if (newImport.toAdd) {
    importRecorder.insertLeft(newImport.pos, newImport.toAdd);
  }
  tree.commitUpdate(importRecorder);
};

const removeImportedNgModule = (
  tree: Tree,
  path: string,
  metadataObject: ts.ObjectLiteralExpression,
  name: string
) => {
    const removed = removeNgModuleFromMetadata(tree, path, metadataObject, name);
    if (removed) {
      removeImport(tree, path, name);
    }

    return removed;
};

const removeNgModuleFromMetadata = (
  tree: Tree,
  path: string,
  metadataObject: ts.ObjectLiteralExpression,
  name: string
): boolean => {
  const metadataImports = getNodesToRemoveFromNestedArray([metadataObject], 'imports', name);
  const isInMetadata = !!metadataImports.length;
  if (isInMetadata) {
    metadataImports.forEach(declaration => {
      removeNode(declaration, path, tree)
    });
  }

  return isInMetadata;
};
