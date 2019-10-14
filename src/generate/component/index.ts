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
  schematic,
  noop,
} from '@angular-devkit/schematics';

import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { parseName } from '@schematics/angular/utility/parse-name';
import { getProjectObject } from '../../angular-project-parser';

import {
  Extensions,
  getExtensions,
  removeNsSchemaOptions,
  PlatformUse,
  getPlatformUse,
  validateGenerateOptions,
} from '../utils';
import { addDeclarationToNgModule } from './ast-utils';
import { Schema as ComponentOptions } from './schema';
import { findModule } from './find-module';

import { Schema as ConvertRelativeImportsSchema } from '../../convert-relative-imports/schema';

class ComponentInfo {
  classPath: string;
  templatePath: string;
  stylesheetPath: string;
  name: string;
}

let extensions: Extensions;

export default function(options: ComponentOptions): Rule {
  let platformUse: PlatformUse;
  let componentInfo: ComponentInfo;

  return chain([
    (tree: Tree) => {
      platformUse = getPlatformUse(tree, options);

      if (platformUse.nsOnly && options.spec !== true) {
        options.spec = false;
      }

      const projectObject = getProjectObject(tree, options.project);
      const styleext = (projectObject && projectObject.schematics && projectObject.schematics['@schematics/angular:component']
        && projectObject.schematics['@schematics/angular:component'].style);
      if (styleext) {
        options.styleext = styleext;
      }

      validateGenerateOptions(platformUse, options);
      validateGenerateComponentOptions(platformUse, options);

      return tree;
    },

    () => externalSchematic(
      '@schematics/angular',
      'component',
      removeNsSchemaOptions({ ...options, skipImport: true }),
    ),

    (tree: Tree) => {
      extensions = getExtensions(tree, options);
      componentInfo = parseComponentInfo(tree, options);
    },

    (tree: Tree) => {
      if (options.skipImport) {
        return tree;
      }

      // this is to ensure that we use the right name for ng module imports
      options.name = componentInfo.name;

      const componentPath = componentInfo.classPath.replace(/\.ts$/, '');
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

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.useWeb) {
        return addWebExtension(tree, componentInfo.templatePath);
      } else {
        return removeFile(tree, componentInfo.templatePath);
      }
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.useWeb) {
        return addWebExtension(tree, componentInfo.stylesheetPath);
      } else {
        return removeFile(tree, componentInfo.stylesheetPath);
      }
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.useNs) {
        return addNativeScriptFiles(componentInfo)(tree, context);
      }
    },

    () => {
      if (!(platformUse.webOnly || platformUse.nsOnly)) {
        return schematic<ConvertRelativeImportsSchema>('convert-relative-imports', options);
      } else {
        return noop();
      }
    },
  ]);
}

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
  };

  const className = `/${component.name}.component.ts`;
  component.classPath = getGeneratedFilePath(className);

  const templateName = `/${component.name}.component.html`;
  component.templatePath = getGeneratedFilePath(templateName);

  const stylesheetName = `/${component.name}.component.${options.styleext}`;
  component.stylesheetPath = getGeneratedFilePath(stylesheetName);

  return component;
};

const addWebExtension = (tree: Tree, filePath: string) => {
  if (extensions.web) {
    const webName = insertExtension(filePath, extensions.web);
    tree.rename(filePath, webName);
  }

  return tree;
};

const removeFile = (tree: Tree, filePath: string) => {
  tree.delete(filePath);

  return tree;
};

const addNativeScriptFiles = (component: ComponentInfo) => {
  const parsedTemplate = parseName('', component.templatePath);
  const nsTemplateName = insertExtension(parsedTemplate.name, extensions.ns);

  const { name: stylesheetName } = parseName('', component.stylesheetPath);
  const nsStylesheetName = insertExtension(stylesheetName, extensions.ns);

  const templateSource = apply(url('./_files'), [
    template({
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
};
