import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';

import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { classify } from '@angular-devkit/core/src/utils/strings';
import { buildRelativePath } from '@schematics/angular/utility/find-module';
import { InsertChange } from '@schematics/angular/utility/change';
import {
  addEntryComponentToModule,
  addExportToModule,
  addDeclarationToModule,
} from '@schematics/angular/utility/ast-utils';
import { Schema as ComponentOptions } from './schema';

export function addDeclarationToNgModule(
  tree: Tree,
  options: ComponentOptions,
  componentPath: string,
  modulePath: string,
) {
  const source = readIntoSourceFile(tree, modulePath);
  const relativePath = buildRelativePath(modulePath, componentPath);
  const classifiedName = classify(`${options.name}Component`);
  const declarationChanges = addDeclarationToModule(source, modulePath, classifiedName, relativePath);
  const declarationRecorder = tree.beginUpdate(modulePath);
  for (const change of declarationChanges) {
    if (change instanceof InsertChange) {
      declarationRecorder.insertLeft(change.pos, change.toAdd);
    }
  }
  tree.commitUpdate(declarationRecorder);
  if (options.export) {
    // Need to refresh the AST because we overwrote the file in the host.
    const src = readIntoSourceFile(tree, modulePath);
    const exportRecorder = tree.beginUpdate(modulePath);
    const exportChanges = addExportToModule(src, modulePath, classify(`${options.name}Component`), relativePath);
    for (const change of exportChanges) {
      if (change instanceof InsertChange) {
        exportRecorder.insertLeft(change.pos, change.toAdd);
      }
    }
    tree.commitUpdate(exportRecorder);
  }
  if (options.entryComponent) {
    // Need to refresh the AST because we overwrote the file in the host.
    const src = readIntoSourceFile(tree, modulePath);
    const entryComponentRecorder = tree.beginUpdate(modulePath);
    const entryComponentChanges = addEntryComponentToModule(
      src,
      modulePath,
      classify(`${options.name}Component`),
      relativePath,
    );

    for (const change of entryComponentChanges) {
      if (change instanceof InsertChange) {
        entryComponentRecorder.insertLeft(change.pos, change.toAdd);
      }
    }
    tree.commitUpdate(entryComponentRecorder);
  }
}

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
  const text = host.read(modulePath);
  if (text === null) {
    throw new SchematicsException(`File ${modulePath} does not exist.`);
  }
  const sourceText = text.toString('utf-8');

  return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}
