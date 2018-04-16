import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  SchematicsException,
  apply,
  url,
  template,
  branchAndMerge,
  mergeWith,
} from '@angular-devkit/schematics';
import { dasherize, classify, } from '@angular-devkit/core/src/utils/strings';

import * as ts from 'typescript';
import { join, dirname } from 'path';

import { Schema as MigrateComponentSchema } from './schema';

import { getAngularProjectSettings, AngularProjectSettings } from '../angular-project-parser';
import { getSourceFile, addExtension, findRelativeImportPath } from '../utils';
import { findImportPath, findNode, findDecoratorNode, insertModuleId } from '../ast-utils';
import { InsertChange } from '@schematics/angular/utility/change';
import { addProviderToModule } from '@schematics/angular/utility/ast-utils';

// let extensions: Extensions;
let projectSettings: AngularProjectSettings;

interface ComponentInfo {
  className: string;
  modulePath: string;
  componentPath: string;
  componentHtmlPath: string;
  // componentStylePath: string;
}

const componentInfo: ComponentInfo = {
  componentPath: '',
  className: '',
  modulePath: '',
  componentHtmlPath: '',
  // componentStylePath: ''
}

export default function(options: MigrateComponentSchema): Rule {
  return chain([
    (tree: Tree, context: SchematicContext) => {
      projectSettings = getAngularProjectSettings(tree, context);
    },
    parseInput(options),

    updateComponentClass(),
    addNsFiles(options),

    addComponentToNsModuleProviders(options)
  ]);
}

const parseInput = (options: MigrateComponentSchema) => (tree: Tree) => {
  findComponentInfo(options, tree);
}

const findComponentInfo = (options: MigrateComponentSchema, tree: Tree) => {
  const hasModule: boolean = !options.skipModule;

  componentInfo.className = classify(`${options.name}Component`);
  componentInfo.modulePath = (hasModule) ? findModulePath(options, tree) : '';
  componentInfo.componentPath = findComponentPath(componentInfo.modulePath, options, tree);
  componentInfo.componentHtmlPath = findTemplateUrl(tree);

  console.log(`ComponentInfo
  ${JSON.stringify(componentInfo, null, 2)}`);
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
    // const componentDirectoryPath = join(projectSettings.appRoot, componentDirectoryName);
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

const findComponentPath = (modulePath: string, options: MigrateComponentSchema, tree: Tree): string => {
  const componentClassName = componentInfo.className;
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

const findTemplateUrl = (tree: Tree): string => {
  const componentSource = getSourceFile(tree, componentInfo.componentPath);

  // First get @Component decorator
  const componentDecoratorNode = findDecoratorNode(componentSource, '@Component');

  // Then extract templateUrl property
  const nodeTemplateUrl = findNode<ts.PropertyAssignment>(componentDecoratorNode, [
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'templateUrl'},
  ])

  if (!nodeTemplateUrl) {
    throw new SchematicsException(`Component ${componentInfo.className} doesn't have templateUrl`);
  }
  
  // Return the value
  const importPath = nodeTemplateUrl.initializer.getText().replace(/["']/g, '');

  return join(
    dirname(componentInfo.componentPath),
    importPath
  );
}

const updateComponentClass = () => (tree: Tree) => {
  insertModuleId(componentInfo.componentPath)(tree);
}

const addNsFiles = (options: MigrateComponentSchema) => (tree: Tree, context: SchematicContext) => {
  const nsext = '.tns';
  // const nsext = '.android';

  context.logger.info('Adding {N} files');
  const templateOptions = {
    dir: dirname(componentInfo.componentHtmlPath),
    
    addNsExtension: (path: string) => addExtension(path, nsext),

    // htmlFileName: componentInfo.componentPath.replace('.ts', '.html'),
    htmlFileName: componentInfo.componentHtmlPath,

    componentName: options.name,
    // componentHtmlPath: 'home',
  };
  const templateSource = apply(url('./_ns-files'), [
      template(templateOptions)
  ]);
  return branchAndMerge(mergeWith(templateSource))(tree, context);
};

const addComponentToNsModuleProviders = (options: MigrateComponentSchema) => (tree: Tree) => {
  if (options.skipModule) {
    return;
  }
  
  const nsext = '.tns';
  const nsModulePath = addExtension(componentInfo.modulePath, nsext);
  
  // Get the changes required to update the @NgModule
  const changes = addProviderToModule(
    getSourceFile(tree, nsModulePath),
    nsModulePath, // <- this doesn't look like it is in use
    componentInfo.className,
    findRelativeImportPath(nsModulePath, componentInfo.componentPath)
  );
    
  // Save changes
  const recorder = tree.beginUpdate(nsModulePath);
  changes.forEach((change: InsertChange) =>
    recorder.insertRight(change.pos, change.toAdd)
  );
  tree.commitUpdate(recorder);
}
