import { getDecoratorMetadata, addImportToModule, addBootstrapToModule, addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';
import { InsertChange, Change } from '@schematics/angular/utility/change';
import { SchematicsException, Rule, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';

import { toComponentClassName } from './utils';

export interface Node {
    getStart();
    getFullStart();
    getEnd();
}

class RemoveContent implements Node {
  constructor(private pos: number, private end: number) {
  }

  public getStart() {
    return this.pos;
  }

  public getFullStart() {
    return this.pos;
  }

  public getEnd() {
    return this.end;
  }
}

export function addSymbolToComponentMetadata(
  source: ts.SourceFile,
  componentPath: string,
  metadataField: string,
  symbolName: string,
): Change[] {
  return addSymbolToDecoratorMetadata(
    source,
    componentPath,
    metadataField,
    symbolName,
    'Component',
    '@angular/core'
  );
}

// Almost identical to addSymbolToNgModuleMetadata from @schematics/angular/utility/ast-utils
// the method can be refactored so that it can be used with custom decorators
export function addSymbolToDecoratorMetadata(
  source: ts.SourceFile,
  componentPath: string,
  metadataField: string,
  symbolName: string,
  decoratorName: string,
  decoratorPackage: string,
): Change[] {
  const nodes = getDecoratorMetadata(source, decoratorName, decoratorPackage);
  let node: any = nodes[0];  // tslint:disable-line:no-any

  // Find the decorator declaration.
  if (!node) {
    return [];
  }

  // Get all the children property assignment of object literals.
  const matchingProperties: ts.ObjectLiteralElement[] =
    (node as ts.ObjectLiteralExpression).properties
    .filter(prop => prop.kind == ts.SyntaxKind.PropertyAssignment)
    // Filter out every fields that's not 'metadataField'. Also handles string literals
    // (but not expressions).
    .filter((prop: ts.PropertyAssignment) => {
      const name = prop.name;
      switch (name.kind) {
        case ts.SyntaxKind.Identifier:
          return (name as ts.Identifier).getText(source) == metadataField;
        case ts.SyntaxKind.StringLiteral:
          return (name as ts.StringLiteral).text == metadataField;
      }

      return false;
    });

  // Get the last node of the array literal.
  if (!matchingProperties) {
    return [];
  }

  if (matchingProperties.length == 0) {
    // We haven't found the field in the metadata declaration. Insert a new field.
    const expr = node as ts.ObjectLiteralExpression;
    let position: number;
    let toInsert: string;
    if (expr.properties.length == 0) {
      position = expr.getEnd() - 1;
      toInsert = `  ${metadataField}: [${symbolName}],\n`;
    } else {
      node = expr.properties[expr.properties.length - 1];
      position = node.getEnd();
      // Get the indentation of the last element, if any.
      const text = node.getFullText(source);
      const matches = text.match(/^\r?\n\s*/);
      if (matches.length > 0) {
        toInsert = `,${matches[0]}${metadataField}: ${symbolName},`;
      } else {
        toInsert = `, ${metadataField}: ${symbolName},`;
      }
    }

    return [new InsertChange(componentPath, position, toInsert)];
  }

  const assignment = matchingProperties[0] as ts.PropertyAssignment;

  // If it's not an array, keep the original value.
  if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return [];
  }

  const arrLiteral = assignment.initializer as ts.ArrayLiteralExpression;
  if (arrLiteral.elements.length == 0) {
    // Forward the property.
    node = arrLiteral;
  } else {
    node = arrLiteral.elements;
  }

  if (!node) {
    console.log('No app module found. Please add your new class to your component.');

    return [];
  }

  if (Array.isArray(node)) {
    const nodeArray = node as {} as Array<ts.Node>;
    const symbolsArray = nodeArray.map(node => node.getText());
    if (symbolsArray.indexOf(symbolName) === -1) {
      return [];
    }

    node = node[node.length - 1];
  }

  let toInsert: string;
  let position = node.getEnd();
  if (node.kind == ts.SyntaxKind.ObjectLiteralExpression) {
    // We haven't found the field in the metadata declaration. Insert a new
    // field.
    const expr = node as ts.ObjectLiteralExpression;
    if (expr.properties.length == 0) {
      position = expr.getEnd() - 1;
      toInsert = `  ${metadataField}: [${symbolName}],\n`;
    } else {
      node = expr.properties[expr.properties.length - 1];
      position = node.getEnd();
      // Get the indentation of the last element, if any.
      const text = node.getFullText(source);
      if (text.match('^\r?\r?\n')) {
        toInsert = `,${text.match(/^\r?\n\s+/)[0]}${metadataField}: [${symbolName},]`;
      } else {
        toInsert = `, ${metadataField}: [${symbolName},]`;
      }
    }
  } else if (node.kind == ts.SyntaxKind.ArrayLiteralExpression) {
    // We found the field but it's empty. Insert it just before the `]`.
    position--;
    toInsert = `${symbolName}`;
  } else {
    // Get the indentation of the last element, if any.
    const text = node.getFullText(source);
    if (text.match(/^\r?\n/)) {
      toInsert = `,${text.match(/^\r?\n(\r?)\s+/)[0]}${symbolName},`;
    } else {
      toInsert = `, ${symbolName},`;
    }
  }

  return [new InsertChange(componentPath, position, toInsert)];
}

export function findFullImports(importName: string, source: ts.SourceFile):
  (ts.ImportDeclaration | ts.ImportSpecifier | RemoveContent)[] {

  const allImports = collectDeepNodes<ts.ImportDeclaration>(source, ts.SyntaxKind.ImportDeclaration);

  return allImports
    // Filter out import statements that are either `import 'XYZ'` or `import * as X from 'XYZ'`.
    .filter(({ importClause: clause }) =>
      clause && !clause.name && clause.namedBindings &&
      clause.namedBindings.kind === ts.SyntaxKind.NamedImports
    )
    .reduce((
      imports: (ts.ImportDeclaration | ts.ImportSpecifier | RemoveContent)[],
      importDecl: ts.ImportDeclaration
    ) => {
      const importClause = importDecl.importClause as ts.ImportClause;
      const namedImports = importClause.namedBindings as ts.NamedImports;

      namedImports.elements.forEach((importSpec: ts.ImportSpecifier) => {
        const importId = importSpec.name;

        if (!(importId.text === importName)) {
          return;
        }

        if (namedImports.elements.length === 1) {
          imports.push(importDecl);
        } else {
          const toRemove = normalizeNodeToRemove<ts.ImportSpecifier>(importSpec, source);
          imports.push(toRemove);
        }
      });

      return imports;
    }, []);

}

export function findMetadataValueInArray(source: ts.SourceFile, property: string, value: string):
  (ts.Node | RemoveContent)[] {

  const decorators = collectDeepNodes<ts.Decorator>(source, ts.SyntaxKind.Decorator)

  const valuesNode = decorators 
    .reduce(
      (nodes, decorator) => [
        ...nodes,
        ...collectDeepNodes<ts.PropertyAssignment>(decorator, ts.SyntaxKind.PropertyAssignment)
      ], [])
    .find(assignment => {
      let isValueForProperty = false;
      ts.forEachChild(assignment, (child: ts.Node) => {
        if (child.kind === ts.SyntaxKind.Identifier && child.getText() === property) {
          isValueForProperty = true;
        }
      });

      return isValueForProperty;
    });

    if (!valuesNode) {
      return [];
    }

    let arrayLiteral;
    ts.forEachChild(valuesNode, (child: ts.Node) => {
      if (child.kind === ts.SyntaxKind.ArrayLiteralExpression) {
        arrayLiteral = child;
      }
    });

    if (!arrayLiteral) {
      return [];
    }

    const values: (ts.Node | RemoveContent)[] = [];
    ts.forEachChild(arrayLiteral, (child: ts.Node) => {
      if (child.getText() === value) {
        const toRemove = normalizeNodeToRemove(child, source);
        values.push(toRemove);
      }
    });

    return values;
}

/**
 * 
 * @param node The node that should be remove
 * @param source The source file that we are removing from
 * This method ensures that if there's a comma before or after the node,
 * it will be removed, too.
 */
function normalizeNodeToRemove<T extends ts.Node>(node: T, source: ts.SourceFile)
  : (T | RemoveContent) {

  const content = source.getText();
  const start = node.getFullStart();
  const end = node.getEnd();
  const symbolBefore = content.substring(start - 1, start);
  const symbolAfter = content.substring(end, end + 1);

  if (symbolBefore === ",") {
    return new RemoveContent(start - 1, end);
  } else if (symbolAfter === ",") {
    return new RemoveContent(start, end + 1);
  } else {
    return node;
  }
}

export function addBootstrapToNgModule(modulePath: string, rootComponentName: string): Rule {
  return (host: Tree) => {
    const content = host.read(modulePath);
    if (!content) {
      throw new SchematicsException(`File ${modulePath} does not exist.`);
    }
    const sourceText = content.toString('utf-8');
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const componentModule = `./${rootComponentName}.component`;
    const rootComponentClassName = toComponentClassName(rootComponentName);

    const importChanges = addImportToModule(source,
      modulePath,
      'NativeScriptModule',
      'nativescript-angular/nativescript.module');

    const bootstrapChanges = addBootstrapToModule(source,
      modulePath,
      rootComponentClassName,
      componentModule);

    const declarationChanges = addSymbolToNgModuleMetadata(
      source,
      modulePath,
      'declarations',
      rootComponentClassName,
    );

    const changes = [
      ...importChanges,
      ...bootstrapChanges,
      ...declarationChanges,
    ];

    const recorder = host.beginUpdate(modulePath);
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(recorder);

    return host;
  };
}

function collectDeepNodes<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T[] {
  const nodes: T[] = [];
  const helper = (child: ts.Node) => {
    if (child.kind === kind) {
      nodes.push(child as T);
    }
    ts.forEachChild(child, helper);
  };
  ts.forEachChild(node, helper);

  return nodes;
}

