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
} from '@angular-devkit/schematics';

import { insertModuleId } from '../../ast-utils';
import { Schema as ComponentOptions } from './schema';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { parseName } from '@schematics/angular/utility/parse-name';
import { Extensions, getExtensions, removeNsSchemaOptions, PlatformUse, getPlatformUse, validateGenerateOptions } from '../utils';
import { Path } from '@angular-devkit/core';

class ComponentInfo {
  classPath: string;
  templatePath: string;
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

      if (
        !platformUse.nsOnly && // the project is shared
        platformUse.useNs && !platformUse.useWeb // the new component is only for {N}
      ) {
        options.skipImport = true; // don't declare it in the web NgModule
      }

      validateGenerateOptions(platformUse, options);
      validateGenerateComponentOptions(platformUse, options);

      return tree;
    },

    () => externalSchematic('@schematics/angular', 'component', removeNsSchemaOptions(options)),

    (tree: Tree) => {
      extensions = getExtensions(tree, options);
      componentInfo = parseComponentInfo(tree, options);
    },

    (tree: Tree) => {
      if (platformUse.nsOnly) {
        insertModuleId(tree, componentInfo.classPath);
      }
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.useWeb) {
        return renameWebTemplate(tree, componentInfo.templatePath);
      } else {
        return removeWebTemplate(tree, context, componentInfo.templatePath);
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
  // const path = `/${projectSettings.root}/${projectSettings.sourceRoot}/app`;
  const component = new ComponentInfo();

  const parsedPath = parseName(options.path || '', options.name);

  component.name = dasherize(parsedPath.name);
  const className = `/${component.name}.component.ts`;
  const templateName = `/${component.name}.component.html`;

  tree.actions.forEach(action => {
    if (action.path.endsWith(templateName)) {
      component.templatePath = action.path;
    }

    if (action.path.endsWith(className)) {
      component.classPath = action.path;
    }
  });

  if (!component.classPath || !component.templatePath) {
    throw new SchematicsException(`Failed to find generated component files from @schematics/angular. Please contact the @nativescript/schematics author.`);
  }

  return component;
}

const renameWebTemplate = (tree: Tree, templatePath: string) => {
  if (extensions.web) {
    const webName = templatePath.replace('.html', `${extensions.web}.html`);
    tree.rename(templatePath, webName);
  }
  return tree;
};

const removeWebTemplate = (tree: Tree, context: SchematicContext, templatePath: string) =>
  filter(
    (path: Path) => !path.match(templatePath)
  )(tree, context)

const addNativeScriptFiles = (component: ComponentInfo) => {
  const parsedTemplate = parseName('', component.templatePath);
  parsedTemplate.name = parsedTemplate.name.replace('.html', `${extensions.ns}.html`);

  const templateSource = apply(url('./_files'), [
    template(<TemplateOptions>{
      path: parsedTemplate.path,
      fileName: parsedTemplate.name,

      name: component.name
    }),
  ]);

  return mergeWith(templateSource);

};
