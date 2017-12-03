import {
  Rule,
  SchematicsException,
  Tree,
  chain,
  externalSchematic,
  template,
  TemplateOptions,
  filter,
} from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { Path, dasherize, normalize } from '@angular-devkit/core';
import { addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';

import * as ts from 'typescript';

import { Schema as ModuleOptions } from './schema';
import { getSourceFile, collectDeepNodes } from '../utils';
import { ImportDeclaration } from 'typescript';

export default function (options: ModuleOptions): Rule {
  let { name, sourceDir, path, flat } = options;
  name = dasherize(name);
  const modulePath = normalize(
    `/${sourceDir}/${path}/`
    + (flat ? '' : name + '/')
    + name + '.module.ts'
  );

  return chain([
    externalSchematic('@schematics/angular', 'module', options),
    filter((path: Path) => !path.match(/\.spec\.ts$/)),
    addNSCommonModule(modulePath),
    removeNGCommonModule(modulePath),
  ]);
}

const addNSCommonModule = (modulePath: string) =>
  (tree: Tree) => {
    const moduleSource = getSourceFile(tree, modulePath);
    const recorder = tree.beginUpdate(modulePath);

    const metadataChange = addSymbolToNgModuleMetadata(
      moduleSource, modulePath,
      'imports', 'NativeScriptCommonModule',
      'nativescript-angular/common');

    metadataChange.forEach((change: InsertChange) =>
      recorder.insertRight(change.pos, change.toAdd)
    );
    tree.commitUpdate(recorder);

    return tree;
  };

const removeNGCommonModule = (modulePath: string) =>
  (tree: Tree) => {
    removeFullImport(tree, modulePath, "CommonModule");
  };

// meant to remove only imports of type
// import { CommonModule } from "@angular/common"
const removeFullImport = (tree: Tree, filePath: string, importName: string) => {
  const source = getSourceFile(tree, filePath);
  const allImports = collectDeepNodes<ts.ImportDeclaration>(source, ts.SyntaxKind.ImportDeclaration);

  const toRemove: ts.ImportDeclaration[] = allImports
    // Filter out import statements that are either `import 'XYZ'` or `import * as X from 'XYZ'`.
    .filter(({ importClause: clause }) =>
      clause && !clause.name && clause.namedBindings &&
      clause.namedBindings.kind === ts.SyntaxKind.NamedImports
    )
    .reduce((importsToRemove: any, importDecl: ts.ImportDeclaration) => {
      const importClause = importDecl.importClause as ts.ImportClause;
      const namedImports = importClause.namedBindings as ts.NamedImports;

      namedImports.elements.forEach((importSpec: ts.ImportSpecifier) => {
        const importId = importSpec.name;

        if (importId.text === importName) {
          importsToRemove.push(importDecl);
        }
      });

      return importsToRemove;
    }, []);

  toRemove.forEach((declaration: ts.ImportDeclaration) => {
    const source = getSourceFile(tree, filePath);
    const recorder = tree.beginUpdate(filePath);

    recorder.remove(declaration.pos, declaration.end - declaration.pos);
    tree.commitUpdate(recorder);
  });
};
