import { dirname } from 'path';

import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  externalSchematic,
  template,
  url,
  mergeWith,
  TemplateOptions,
  filter,
  DirEntry,
} from '@angular-devkit/schematics';

import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { Path } from '@angular-devkit/core';
import { parseName } from '@schematics/angular/utility/parse-name';

import { Extensions, getExtensions, removeNsSchemaOptions, PlatformUse, getPlatformUse, validateGenerateOptions } from '../utils';
import { addDeclarationToNgModule, insertModuleId } from './ast-utils';
import { Schema as ComponentOptions } from './schema';
import { findModule } from './find-module';

class ComponentInfo {
  classPath: string;
  templatePath: string;
  stylesheetPath: string;
  name: string;

  constructor() { }
}

let extensions: Extensions;

export default function (options: ComponentOptions): Rule {
  let platformUse: PlatformUse;
  let componentInfo: ComponentInfo;

  return chain([
    (tree: Tree) => {
      platformUse = getPlatformUse(tree, options);

      if (platformUse.nsOnly && options.spec !== true) {
        options.spec = false;
      }

      validateGenerateOptions(platformUse, options);
      validateGenerateComponentOptions(platformUse, options);

      return tree;
    },

    () => externalSchematic('@schematics/angular', 'component', removeNsSchemaOptions({ ...options, skipImport: true })),

    (tree: Tree) => {
      extensions = getExtensions(tree, options);
      componentInfo = parseComponentInfo(tree, options);
    },
    
    (tree: Tree) => {
      if (options.skipImport) {
        return tree;
      }

      const componentPath = componentInfo.classPath;
      const componentDir = dirname(componentPath);
      if (platformUse.useWeb) {
        const webModule = findModule(tree, options, componentDir, extensions.web);
        addDeclarationToNgModule(tree, options, componentPath, webModule);
      }

      if (platformUse.useNs) {
        const nsModule = findModule(tree, options, componentDir, extensions.ns);
        addDeclarationToNgModule(tree, options, componentPath, nsModule);
      }

      return tree;
    },

    (tree: Tree) => {
      if (platformUse.nsOnly) {
        insertModuleId(tree, componentInfo.classPath);
      }
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.useWeb) {
        return renameFile(tree, componentInfo.templatePath);
      } else {
        return removeFile(tree, context, componentInfo.templatePath);
      }
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.useWeb) {
        return renameFile(tree, componentInfo.stylesheetPath);
      } else {
        return removeFile(tree, context, componentInfo.stylesheetPath);
      }
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.useNs) {
        return addNativeScriptFiles(componentInfo)(tree, context);
      }
    }
  ]);
};

const validateGenerateComponentOptions = (platformUse: PlatformUse, options: ComponentOptions) => {
  if (platformUse.webReady && options.inlineTemplate) {
    throw new SchematicsException('You cannot use the --inlineTemplate option for web+ns component!');
  }
};

const parseComponentInfo = (tree: Tree, options: ComponentOptions): ComponentInfo => {
  const component = new ComponentInfo();

  const parsedPath = parseName(options.path || '', options.name);
  component.name = dasherize(parsedPath.name);

  const getGeneratedFilePath = (searchPath: string) => {
    const action = tree.actions.find(({ path }) => path.endsWith(searchPath));
    if (!action) {
      throw new SchematicsException(
        `Failed to find generated component file ${searchPath}. ` +
        `Please contact the @nativescript/schematics author.`);
    }

    return action.path;
  }

  const className = `/${component.name}.component.ts`;
  component.classPath = getGeneratedFilePath(className);

  const templateName = `/${component.name}.component.html`;
  component.templatePath = getGeneratedFilePath(templateName);

  const stylesheetName = `/${component.name}.component.${options.styleext}`;
  component.stylesheetPath = getGeneratedFilePath(stylesheetName)

  return component;
}

const renameFile = (tree: Tree, filePath: string) => {
  if (extensions.web) {
    const webName = insertExtension(filePath, extensions.web);
    tree.rename(filePath, webName);
  }
  return tree;
};

const removeFile = (tree: Tree, context: SchematicContext, filePath: string) =>
  filter(
    (path: Path) => !path.match(filePath)
  )(tree, context)

const addNativeScriptFiles = (component: ComponentInfo) => {
  const parsedTemplate = parseName('', component.templatePath);
  const nsTemplateName = insertExtension(parsedTemplate.name, extensions.ns);

  const { name: stylesheetName } = parseName('', component.stylesheetPath);
  const nsStylesheetName = insertExtension(stylesheetName, extensions.ns);

  const templateSource = apply(url('./_files'), [
    template(<TemplateOptions>{
      name: component.name,
      path: parsedTemplate.path,
      templateName: nsTemplateName,
      stylesheetName: nsStylesheetName,
    }),
  ]);

  return mergeWith(templateSource);
};

const insertExtension = (fileName: string, extension: string) => {
  const extensionStart = fileName.lastIndexOf('.');

  const newFilename = fileName.substr(0, extensionStart) +
    extension +
    fileName.substr(extensionStart);

  return newFilename;
}
