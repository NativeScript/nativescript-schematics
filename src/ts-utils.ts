import { getDecoratorMetadata, addImportToModule, addBootstrapToModule, addSymbolToNgModuleMetadata, findNodes } from '@schematics/angular/utility/ast-utils';
import { InsertChange, Change } from '@schematics/angular/utility/change';
import { SchematicsException, Rule, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';

import { toComponentClassName, Node, removeNode, getFileContents, getJsonFile } from './utils';
import { dirname } from 'path';

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

  return getSymbolsToAddToObject(componentPath, node, metadataField, symbolName);
}

export function getSymbolsToAddToObject(path: string, node: any, metadataField: string, symbolName: string) {
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
          return (name as ts.Identifier).getText() == metadataField;
        case ts.SyntaxKind.StringLiteral:
          return (name as ts.StringLiteral).text == metadataField;
      }

      return false;
    });

  // Get the last node of the array literal.
  if (!matchingProperties) {
    return [];
  }

  if (matchingProperties.length === 0) {
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
      const text = node.getFullText();
      const matches = text.match(/^\r?\n\s*/);
      if (matches && matches.length > 0) {
        toInsert = `,${matches[0]}${metadataField}: ${symbolName},`;
      } else {
        toInsert = `, ${metadataField}: ${symbolName},`;
      }
    }

    return [new InsertChange(path, position, toInsert)];
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
    if (symbolsArray.indexOf(symbolName) !== -1) {
      return [];
    }

    node = node[node.length - 1];
  }

  let toInsert: string;
  let position = node.getEnd();
  if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
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
      const text = node.getFullText();
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
    const text = node.getFullText();
    if (text.match(/^\r?\n/)) {
      toInsert = `,${text.match(/^\r?\n(\r?)\s+/)[0]}${symbolName},`;
    } else {
      toInsert = `, ${symbolName},`;
    }
  }

  return [new InsertChange(path, position, toInsert)];
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

export function findImports(importName: string, source: ts.SourceFile):
  (ts.ImportDeclaration)[] {

  const allImports = collectDeepNodes<ts.ImportDeclaration>(source, ts.SyntaxKind.ImportDeclaration);

  return allImports
    .filter(({ importClause: clause }) =>
      clause && !clause.name && clause.namedBindings &&
      clause.namedBindings.kind === ts.SyntaxKind.NamedImports
    )
    .reduce((
      imports: (ts.ImportDeclaration)[],
      importDecl: ts.ImportDeclaration
    ) => {
      const importClause = importDecl.importClause as ts.ImportClause;
      const namedImports = importClause.namedBindings as ts.NamedImports;

      namedImports.elements.forEach((importSpec: ts.ImportSpecifier) => {
        const importId = importSpec.name;
        if (importId.text === importName) {
          imports.push(importDecl);
        }
      });

      return imports;
    }, []);
}

export function findMetadataValueInArray(source: ts.Node, property: string, value: string):
  (ts.Node | RemoveContent)[] {

  const decorators = collectDeepNodes<ts.Decorator>(source, ts.SyntaxKind.Decorator)
  return getNodesToRemoveFromNestedArray(decorators, property, value);
}

export function getNodesToRemoveFromNestedArray(nodes: ts.Node[], property: string, value: string) {
  const valuesNode = nodes 
    .reduce(
      (nodes, current) => [
        ...nodes,
        ...collectDeepNodes<ts.PropertyAssignment>(current, ts.SyntaxKind.PropertyAssignment)
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
        const toRemove = normalizeNodeToRemove(child, arrayLiteral);
        values.push(toRemove);
      }
    });

    return values;
}

/**
 * 
 * @param node The node that should be removed
 * @param source The source file that we are removing from
 * This method ensures that if there's a comma before or after the node,
 * it will be removed, too.
 */
function normalizeNodeToRemove<T extends ts.Node>(node: T, source: ts.Node)
  : (T | RemoveContent) {

  const content = source.getText();
  const nodeStart = node.getFullStart();
  const nodeEnd = node.getEnd();
  const start = nodeStart - source.getFullStart();
  const symbolBefore = content.substring(start - 1, start);

  if (symbolBefore === ',') {
    return new RemoveContent(nodeStart - 1, nodeEnd);
  } else {
    return new RemoveContent(nodeStart, nodeEnd + 1);
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

export function collectDeepNodes<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T[] {
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

export function filterByChildNode(
  root: ts.Node,
  condition: (node: ts.Node) => boolean
): boolean {
  let matches = false;
  const helper = (child: ts.Node) => {
    if (condition(child)) {
      matches = true;
      return;
    }
  }

  ts.forEachChild(root, helper);

  return matches;
}

export const getDecoratedClass = (tree: Tree, filePath: string, decoratorName: string, className: string) => {
  return getDecoratedClasses(tree, filePath, decoratorName)
    .find(c => !!(c.name && c.name.getText() === className));
};

export const getDecoratedClasses = (tree: Tree, filePath: string, decoratorName: string) => {
  const moduleSource = getSourceFile(tree, filePath);
  const classes = collectDeepNodes<ts.ClassDeclaration>(moduleSource, ts.SyntaxKind.ClassDeclaration);

  return classes.filter(c => !!getDecorator(c, decoratorName))
};

export const getDecoratorMetadataFromClass = (classNode: ts.Node, decoratorName: string) => {
  const decorator = getDecorator(classNode, decoratorName);
  if (!decorator) {
    return;
  }

  return (<ts.CallExpression>decorator.expression).arguments[0];
};

const getDecorator = (node: ts.Node, name: string) => {
  return node.decorators && node.decorators.find((decorator: ts.Decorator) => 
    decorator.expression.kind === ts.SyntaxKind.CallExpression &&
      (<ts.CallExpression>decorator.expression).expression.getText() === name
  );
};

export const removeMetadataArrayValue = (tree: Tree, filePath: string, property: string, value: string) => {
  const source = getSourceFile(tree, filePath);
  const nodesToRemove = findMetadataValueInArray(source, property, value);

  nodesToRemove.forEach(declaration =>
    removeNode(declaration, filePath, tree)
  );
}

export const removeImport = (tree: Tree, filePath: string, importName: string) => {
  const source = getSourceFile(tree, filePath);
  const importsToRemove = findFullImports(importName, source);

  importsToRemove.forEach(declaration =>
    removeNode(declaration, filePath, tree)
  );
};

/**
 * Insert `toInsert` after the last occurence of `ts.SyntaxKind[nodes[i].kind]`
 * or after the last of occurence of `syntaxKind` if the last occurence is a sub child
 * of ts.SyntaxKind[nodes[i].kind] and save the changes in file.
 *
 * @param nodes insert after the last occurence of nodes
 * @param toInsert string to insert
 * @param file file to insert changes into
 * @param fallbackPos position to insert if toInsert happens to be the first occurence
 * @param syntaxKind the ts.SyntaxKind of the subchildren to insert after
 * @return Change instance
 * @throw Error if toInsert is first occurence but fall back is not set
 */
export function insertBeforeFirstOccurence(nodes: ts.Node[],
                                          toInsert: string,
                                          file: string,
                                          fallbackPos: number,
                                          syntaxKind?: ts.SyntaxKind): Change {
  let firstItem = nodes.sort(nodesByPosition).shift();
  if (!firstItem) {
    throw new Error();
  }
  if (syntaxKind) {
    firstItem = findNodes(firstItem, syntaxKind).sort(nodesByPosition).shift();
  }
  if (!firstItem && fallbackPos == undefined) {
    throw new Error(`tried to insert ${toInsert} as first occurence with no fallback position`);
  }
  const firstItemPosition: number = firstItem ? firstItem.getStart() : fallbackPos;

  return new InsertChange(file, firstItemPosition, toInsert);
}

/**
 * Helper for sorting nodes.
 * @return function to sort nodes in increasing order of position in sourceFile
 */
function nodesByPosition(first: ts.Node, second: ts.Node): number {
  return first.getStart() - second.getStart();
}

export interface SearchParam {
  name?: string;
  kind: ts.SyntaxKind;
}

export function findNode<T extends ts.Node>(node: ts.Node, searchParams: SearchParam[], filter: string = ''): T {
  
  const matchingNodes = findMatchingNodes<T>(node, searchParams);
  if (matchingNodes.length === 0) {
    //TODO: This might require a better error message.
    const nodesText = searchParams
    .map(item => item.name || item.kind)
    .reduce((name, result) => name + ' => ' + result);
    throw new SchematicsException(`Failed to find ${nodesText} in ${node.getSourceFile().fileName}.`);
  }
  const result = matchingNodes.filter(node => node.getText().includes(filter));
  if (result.length !== 1) {
    const nodesText = searchParams
    .map(item => item.name)
    .reduce((name, result) => name + ' => ' + result);
    if (result.length === 0) {
      if (filter !== '') {
        throw new SchematicsException(`Failed to find ${filter} for ${nodesText} in ${node.getSourceFile().fileName}.`);
      }
      else {
        throw new SchematicsException(`Failed to find ${nodesText} in ${node.getSourceFile().fileName}.`);
      }
    }
    else {
      throw new SchematicsException(`Found too many [${result.length} / expected 1] ${nodesText} in ${node.getSourceFile().fileName}.`);
    }
  }
  return result[0];
}

export function findMatchingNodes<T extends ts.Node>(node: ts.Node, searchParams: SearchParam[], index = 0): T[] {
  const searchParam = searchParams[index];
  const nodes: T[] = [];
  const helper = (child: ts.Node) => {
    if (isMatchingNode(child, searchParam)) {
      if (index === searchParams.length - 1) {
        nodes.push(child as T);
      }
      else {
        nodes.push(...findMatchingNodes<T>(child, searchParams, index + 1));
      }
    }
    else {
      if (child.getChildCount() > 0) {
        ts.forEachChild(child, helper);
      }
    }
  };
  ts.forEachChild(node, helper);
  return nodes;
}

/**
* Check if the node.kind matches the searchParam.kind
* Also, if name provided, then check if we got the node with the right param name
*/
function isMatchingNode(node: ts.Node, searchParam: SearchParam) {
  if (node.kind !== searchParam.kind) {
    return false;
  }
  // If name provided the run it through checkNameForKind check
  // otherwise just return true
  return (searchParam.name) ? checkNameForKind(node, searchParam) : true;
}

function checkNameForKind(node: ts.Node, searchParam: SearchParam): boolean {
  if (!searchParam.name) {
    throw new SchematicsException(`checkNameForKind shouldn't be called without a name. Object => ${JSON.stringify(searchParam)} `);
  }
  let child: ts.Node;
  switch (searchParam.kind) {
    case ts.SyntaxKind.VariableDeclaration:
    case ts.SyntaxKind.PropertyAssignment:
      child = node.getChildAt(0);
      break;
    case ts.SyntaxKind.CallExpression:
      const callExpression = node as ts.CallExpression;
      const expression = callExpression.expression;
      // if function is an object's property - i.e. parent.fname()
      if (ts.isPropertyAccessExpression(expression)) {
        child = expression.name;
      }
      else {
        child = expression;
      }
      break;
    case ts.SyntaxKind.Identifier:
      child = node;
      break;
    case ts.SyntaxKind.NewExpression:
      const newExpression = node as ts.NewExpression;
      child = newExpression.expression;
      break;
    case ts.SyntaxKind.ImportDeclaration:
      const importDeclaration = node as ts.ImportDeclaration;
      if (!importDeclaration.importClause || !importDeclaration.importClause.namedBindings) {
        return false;
      }
      const namedBindings = importDeclaration.importClause.namedBindings;
      // for imports like: import { a, b } from 'path'
      // import names [a,b] are at: node.importClause.namedBindings.elements
      if (ts.isNamedImports(namedBindings)) {
        const elements = namedBindings.elements;
        return elements.some(element => element.getText() === searchParam.name);
      }
      // otherwise, it is an import like: import * as abc from 'path'
      // import name [abc] is at: node.importClause.namedBindings.name
      child = namedBindings.name;
      break;
    case ts.SyntaxKind.ClassDeclaration:
      const classDeclaration = node as ts.ClassDeclaration;
      if (!classDeclaration.name) {
        return false;
      }
      child = classDeclaration.name;
      break;
    case ts.SyntaxKind.Decorator:
      const decorator = node as ts.Decorator;
      const decoratorCallExpression = decorator.expression as ts.CallExpression;
      
      child = decoratorCallExpression.expression
      break;
    default:
      throw new SchematicsException(`compareNameForKind: not prepared for this [${node.kind}] ts.SyntaxKind`);
  }
  return child.getText() === searchParam.name;
}

export function findImportPath(source: ts.Node, name) {
  const node = findNode<ts.ImportDeclaration>(source, [
    { kind: ts.SyntaxKind.ImportDeclaration, name },
  ]);

  const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
  return moduleSpecifier.text;
}

export const updateNodeText = (tree: Tree, node: ts.Node, newText: string) => {
  const recorder = tree.beginUpdate(node.getSourceFile().fileName);
  recorder.remove(node.getStart(), node.getText().length);
  recorder.insertLeft(node.getStart(), newText);
  tree.commitUpdate(recorder);
};

export const replaceTextInNode = (tree: Tree, node: ts.Node, oldText: string, newText: string) => {
  const index = node.getStart() + node.getText().indexOf(oldText);
  const recorder = tree.beginUpdate(node.getSourceFile().fileName);
  recorder.remove(index, oldText.length);
  recorder.insertLeft(index, newText);
  tree.commitUpdate(recorder);
}

export function parseTsConfigFile(tree: Tree, tsConfigPath: string): ts.ParsedCommandLine {
  const config = getJsonFile(tree, tsConfigPath);
  const host: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    readDirectory: ts.sys.readDirectory,
    fileExists: (file: string) => tree.exists(file),
    readFile: (file: string) => getFileContents(tree, file)
  };
  const basePath = dirname(tsConfigPath);

  const tsConfigObject = ts.parseJsonConfigFileContent(config, host, basePath);

  return tsConfigObject;
}

export const getSourceFile = (host: Tree, path: string): ts.SourceFile => {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(
      `Could not find file at ${path}. See https://github.com/NativeScript/nativescript-schematics/issues/172.`
    );
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}
