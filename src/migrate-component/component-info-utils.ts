import { Schema as MigrateComponentSchema } from './schema';

import { dasherize, classify, } from '@angular-devkit/core/src/utils/strings';
import { SchematicsException, Tree, SchematicContext } from '@angular-devkit/schematics';
import { join, dirname } from 'path';
import * as ts from 'typescript';

import { AngularProjectSettings, getAngularProjectSettings } from '../angular-project-parser';
import { getSourceFile } from '../utils';
import { findImportPath, findDecoratorNode, findNode, findMatchingNodes } from '../ast-utils';

export interface ComponentInfo {
  className: string;
  modulePath: string;
  componentPath: string;
  componentHtmlPath: string;
  // componentStylePath: string;
}

let projectSettings: AngularProjectSettings;

export const parseComponentInfo = (options: MigrateComponentSchema) => (tree: Tree, context: SchematicContext) => {
  projectSettings = getAngularProjectSettings(tree, context);
  const hasModule: boolean = !options.skipModule;

  const className = classify(`${options.name}Component`);
  const modulePath = (hasModule) ? findModulePath(options, tree) : '';
  const componentPath = findComponentPath(className, modulePath, options, tree);
  const componentHtmlPath = findTemplateUrl(componentPath, className, tree);

  const componentInfo: ComponentInfo = {
    className,
    modulePath,
    componentPath,
    componentHtmlPath
  }

  console.log(`ComponentInfo
  ${JSON.stringify(componentInfo, null, 2)}`);

  return componentInfo;
}

const findModulePath = (options: MigrateComponentSchema, tree: Tree): string => {
  let modulePath = '';

  // When module Path provided, check if it is correct
  if (options.modulePath) {
    modulePath = join(projectSettings.appRoot, 'app', options.modulePath);

    if (!tree.exists(modulePath)) {
      throw new SchematicsException(`Invalid --modulePath: ${options.modulePath}
  File cannot be found at ${modulePath}
  Expecting something like: module-name/module-name.module.ts`);
    }
  }
  // If no Module provided or if it is App or AppModule
  else if (
    !options.module ||
    options.module.toLowerCase() === projectSettings.entryModuleName.toLowerCase() ||
    options.module.toLowerCase() === projectSettings.entryModuleClassName.toLowerCase()
  ) {
    modulePath = projectSettings.entryModulePath;
  } 
  // When a specified Module has been provided
  else {
    modulePath = join(
      projectSettings.appRoot,                  // src/
      'app',                                    // app/
      dasherize(options.module),                // some-name/
      dasherize(options.module) + '.module.ts'  // some-name.module.ts
    );

    if (tree.exists(modulePath)) {
      //all good
    } else {
      throw new SchematicsException(`couldn't find the module at: ${modulePath}`);
    }
  }

  return modulePath;
}

const findComponentPath = (componentClassName: string, modulePath: string, options: MigrateComponentSchema, tree: Tree): string => {
  let componentPath = '';

  // When the path is provided, then there is no need to look anywhere else
  if (options.componentPath) {
    componentPath = join(projectSettings.appRoot, 'app', options.componentPath);

    if (!tree.exists(componentPath)) {
      throw new SchematicsException(`Invalid --path value ${options.componentPath}
  Couldn't find the file at: ${componentPath}
  Expecting something like: component-name/component-name.component.ts`);
    }

    // TODO: add a check to see if componentClassName is the class used in componentPath file content
    const source = getSourceFile(tree, componentPath);
    const matchingNodes = findMatchingNodes<ts.ClassDeclaration>(source, [
      { kind: ts.SyntaxKind.ClassDeclaration, name: componentClassName}
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
  else if (!options.skipModule) {
    const source = getSourceFile(tree, modulePath);
    const componentImportPath = findImportPath(source, componentClassName);
    console.log(`${componentClassName} import found in its module at: ${componentImportPath}`);
    
    componentPath = join(dirname(modulePath), componentImportPath + '.ts')
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
    const app = join(projectSettings.appRoot, 'app');

    // search at src/app/file-name
    if (tree.exists(join(app, fileName))) {
       componentPath = join(app, fileName);
    }
    // search at src/app/dasherize(component-name)/file-name
    else if (tree.exists(join(app, dasherize(options.name), fileName))) {
      componentPath = join(app, dasherize(options.name), fileName);
    } else {
      console.log(`Couldn't find the component .ts file`);
    }
  }

  return componentPath;
}

const findTemplateUrl = (componentPath: string, componentClassName: string, tree: Tree): string => {
  const componentSource = getSourceFile(tree, componentPath);

  // First get @Component decorator
  const componentDecoratorNode = findDecoratorNode(componentSource, '@Component');

  // Then extract templateUrl property
  const nodeTemplateUrl = findNode<ts.PropertyAssignment>(componentDecoratorNode, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'templateUrl'},
  ])

  if (!nodeTemplateUrl) {
    throw new SchematicsException(`Component ${componentClassName} doesn't have templateUrl`);
  }
  
  // Return the value
  const importPath = nodeTemplateUrl.initializer.getText().replace(/["']/g, '');

  return join(
    dirname(componentPath),
    importPath
  );
}

