import * as ts from 'typescript';
import { SchematicsException } from '@angular-devkit/schematics';

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
    default:
    throw new SchematicsException(`compareNameForKind: not prepared for this [${node.kind}] ts.SyntaxKind`);
  }
  return child.getText() === searchParam.name;
}

export function getFunctionParams(source: ts.Node, name: string) {
  const node = findNode<ts.CallExpression>(source, [
    { kind: ts.SyntaxKind.CallExpression, name },
  ]);

  if (node.getChildCount() !== 4) {
    throw new SchematicsException(`Couldn't find function params for ${name} in ${node.getSourceFile().fileName}`);
  }
  return node.arguments.map(node => node.getText());
}

export function findImportPath(source: ts.Node, name) {
  const node = findNode<ts.ImportDeclaration>(source, [
    { kind: ts.SyntaxKind.ImportDeclaration, name },
  ]);
  let path = node.moduleSpecifier.getText();
  path = path.replace(/["']/g, '');
  return path;
}

// function findImportNode(source: ts.Node, name: string): ts.Node {
//   const node = findNode<ts.ImportDeclaration>(source, [
//     { kind: ts.SyntaxKind.ImportDeclaration, name },
//   ]);
//   if (node.getChildCount() !== 5) {
//     throw new SchematicsException(`Couldn't find function params for ${name} in ${node.getSourceFile().fileName}`);
//   }
//   return node;
// } 
