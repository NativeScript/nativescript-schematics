import { Schema as MigrateComponentSchema } from './schema';

import { dasherize, classify, } from '@angular-devkit/core/src/utils/strings';
import { SchematicsException, Tree, SchematicContext } from '@angular-devkit/schematics';
import { join, dirname } from 'path';
import * as ts from 'typescript';

import { AngularProjectSettings, getAngularProjectSettings } from '../angular-project-parser';
import { getSourceFile } from '../utils';
import { findImportPath, findMatchingNodes } from '../ast-utils';
import { findDecoratorPropertyNode } from '../decorator-utils';

export interface ComponentInfo {
  className: string;
  modulePath: string;
  componentPath: string;
  componentHtmlPath: string;
  componentStylePath: string;
}

let projectSettings: AngularProjectSettings;

export const parseComponentInfo = (options: MigrateComponentSchema) => (tree: Tree, context: SchematicContext) => {
  projectSettings = getAngularProjectSettings(tree, options.project);

  const className = (options.name.endsWith('Component'))
    ? options.name
    : classify(`${options.name}Component`);

  // if no module is provided and the skipModule flag is on, then don't search for module path
  const modulePath = (!options.module && options.skipModule) ? '' : findModulePath(options, tree);

  const componentPath = findComponentPath(className, modulePath, options, tree);
  const componentHtmlPath = findTemplateUrl(componentPath, className, tree);

  const componentStylePath = findStyleUrl(componentPath, className, tree);

  const componentInfo: ComponentInfo = {
    className,
    modulePath,
    componentPath,
    componentHtmlPath,
    componentStylePath
  }

  context.logger.info(`ComponentInfo
${JSON.stringify(componentInfo, null, 2)}`);

  return componentInfo;
}

const findModulePath = (options: MigrateComponentSchema, tree: Tree): string => {
  // When module Path provided, 
  if (options.modulePath) {
    // check if it is correct
    if (tree.exists(options.modulePath)) {
      return options.modulePath;
    }

    // or maybe we need to add src/app/
    const modulePath = join(projectSettings.sourceRoot, 'app', options.modulePath);
    if (!tree.exists(modulePath)) {
      throw new SchematicsException(`Invalid --modulePath: ${options.modulePath}
  File cannot be found at ${options.modulePath} or ${modulePath}`);
    }

    return modulePath;
  }
  // If no Module provided or if it is App or AppModule
  else if (
    !options.module ||
    options.module.toLowerCase() === projectSettings.entryModuleName.toLowerCase() ||
    options.module.toLowerCase() === projectSettings.entryModuleClassName.toLowerCase()
  ) {
    return projectSettings.entryModulePath;
  }
  // When a specified Module has been provided
  else {
    const modulePath = join(
      projectSettings.sourceRoot,               // src/
      'app',                                    // app/
      dasherize(options.module),                // some-name/
      dasherize(options.module) + '.module.ts'  // some-name.module.ts
    );

    if (tree.exists(modulePath)) {
      return modulePath;
    } else {
      throw new SchematicsException(`couldn't find the module at: ${modulePath}`);
    }
  }
}

const findComponentPath = (componentClassName: string, modulePath: string, options: MigrateComponentSchema, tree: Tree): string => {
  let componentPath = '';

  // When the path is provided, then there is no need to look anywhere else
  if (options.componentPath) {
    componentPath = join(projectSettings.sourceRoot, 'app', options.componentPath);

    if (!tree.exists(componentPath)) {
      throw new SchematicsException(`Invalid --path value ${options.componentPath}
  Couldn't find the file at: ${componentPath}
  Expecting something like: component-name/component-name.component.ts`);
    }

    // Check to see if componentClassName is the class used in componentPath file content
    const source = getSourceFile(tree, componentPath);
    const matchingNodes = findMatchingNodes<ts.ClassDeclaration>(source, [
      { kind: ts.SyntaxKind.ClassDeclaration, name: componentClassName }
    ])

    if (matchingNodes.length === 0) {
      throw new SchematicsException(`The file at the provided --path: 
  [${componentPath}]
  doesn't contain the ${componentClassName} Class`);
    } else {
      console.log("NODE MATCHES")
    }
  }
  
  // When we have the module that imports the component
  // else if (!options.skipModule) {
  else if (modulePath) {
    const source = getSourceFile(tree, modulePath);
    const componentImportPath = findImportPath(source, componentClassName);
    console.log(`${componentClassName} import found in its module at: ${componentImportPath}`);
    
    componentPath = join(dirname(modulePath), componentImportPath);
    if (!componentPath.endsWith('.ts')) {
      componentPath = componentPath + '.ts';
    }

    if (tree.exists(componentPath)) {
      console.log(`${componentClassName} file found at: ${componentPath}`);
    } else {
      throw new SchematicsException(`Cannot locate Component ${componentClassName} at: ${componentPath}`);
    }
  }

  // When the component is not part of any module
  else {
    console.log(`Trying to deduct ${componentClassName} location following Angular best practices`);

    const fileName = `${dasherize(options.name)}.component.ts`;
    const app = join(projectSettings.sourceRoot, 'app');

    // search at src/app/file-name
    if (tree.exists(join(app, fileName))) {
       componentPath = join(app, fileName);
    }
    // search at src/app/dasherize(component-name)/file-name
    else if (tree.exists(join(app, dasherize(options.name), fileName))) {
      componentPath = join(app, dasherize(options.name), fileName);
    } else {
      throw new SchematicsException(`Couldn't find component's .ts file.
  You can use --component-path parameter to provide the path to the component.
  Hint. don't include src/app with --component-path`);
    }
  }

  return componentPath;
}

const findTemplateUrl = (componentPath: string, componentClassName: string, tree: Tree): string => {
  const source = getSourceFile(tree, componentPath);

  const node = findDecoratorPropertyNode(source, componentClassName, 'Component', 'templateUrl');
  if (node === null) {
    // TODO: need a solution for components that don't use templateUrl
    throw new SchematicsException(`${componentClassName} cannot be converted, as it should be using templateUrl property in the @NgModule decorator`);
  }

  if (ts.isStringLiteral(node)) {
    const templatePath = node.text;
    return join(
      dirname(componentPath),
      templatePath
    );
  } else {
    throw new SchematicsException(`${node.getText()} for Component ${componentClassName} is expected have the assigned value as StringLiteral`);
  }
}

const findStyleUrl = (componentPath: string, componentClassName: string, tree: Tree): string => {
  const source = getSourceFile(tree, componentPath);

  const node = findDecoratorPropertyNode(source, componentClassName, 'Component', 'styleUrls');
  if (node === null) {
    return '';
  }

  if (ts.isArrayLiteralExpression(node) && node.elements.length > 0) {
    const stylePath = (node.elements[0] as ts.StringLiteral).text;

    return join(
      dirname(componentPath),
      stylePath
    );
  }

  return '';
}

