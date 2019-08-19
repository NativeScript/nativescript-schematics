import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Tree } from '@angular-devkit/schematics';

import { findNode, findMatchingNodes, findImportPath, getSourceFile } from './ts-utils';

export interface ClassImport {
  name: string;
  importPath: string;
}

const findDecoratorNode = (source: ts.Node, className: string, decoratorName: string): ts.Decorator => {
  // Remove @ in case @Component or @NgModule provided
  const safeDecoratorName = decoratorName.replace('@', '');

  const node = findNode<ts.Decorator>(source, [
    { kind: ts.SyntaxKind.ClassDeclaration, name: className },
    { kind: ts.SyntaxKind.Decorator, name: safeDecoratorName },
  ]);

  return node;
};

/**
 * Can be used to retrieve the metada from @Component, @NgModule etc. decorators
 * @param source source node, use => getSourceFile(tree, filePath)
 * @param className name of the parent class
 * @param decoratorName name of the decorator. No need to add the @ symbol
 * @param propertyName name of the property to be extracted from the decorator
 * @returns node containing the property value. You can parse it to either ArrayLiteralExpression or StringLiteral
 */
export const findDecoratorPropertyNode = (
  source: ts.Node,
  className: string,
  decoratorName: string,
  propertyName: string,
): ts.Expression | null => {
 const decoratorNode = findDecoratorNode(source, className, decoratorName);

 const propertyNodes = findMatchingNodes<ts.PropertyAssignment>(decoratorNode, [
   { kind: ts.SyntaxKind.PropertyAssignment, name: propertyName },
 ]);

 if (propertyNodes.length === 0) {
   console.log(`Couldn't find Property ${propertyName} for
 Class: ${className}
 Decorator: ${decoratorName}
 in ${source.getSourceFile().fileName}`);

   return null;
 }

 return propertyNodes[0].initializer;
};

export const getNgModuleProperties = (
  modulePath: string,
  className: string,
  propertyName: string,
  tree: Tree,
): Array<ClassImport> => {
  const source = getSourceFile(tree, modulePath);

  const node = findDecoratorPropertyNode(source, className, 'NgModule', propertyName);
  if (node === null || !ts.isArrayLiteralExpression(node)) {
    // property not found
    return [];
  }

  const items = node.elements.filter(ts.isIdentifier).map((element) => element.text);

  return items.map((currentClassName) => {
    return {
      name: currentClassName,
      importPath: findImportPath(source, currentClassName),
    };
  });
};
