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
  branchAndMerge,
  mergeWith,
  TemplateOptions,
  filter,
} from '@angular-devkit/schematics';

import { insertModuleId } from '../../ast-utils';
import { Schema as ComponentOptions } from './schema';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { parseName } from '@schematics/angular/utility/parse-name';
import { Extensions, getExtensions, removeNsSchemaOptions, PlatformUse, getPlatformUse } from '../utils';
import { Path } from '@angular-devkit/core';

class ComponentInfo {
  classPath: string;
  templatePath: string;
  name: string;

  constructor() {}
}

let extensions: Extensions;

export default function (options: ComponentOptions): Rule {
  let platformUse: PlatformUse;
  let componentInfo: ComponentInfo;

  return chain([
    (tree: Tree) => {
      console.log('Get Platform again');
      platformUse = getPlatformUse(tree, options);
    },

    () => {
      validateOptions(platformUse, options);
    },

    externalSchematic('@schematics/angular', 'component', removeNsSchemaOptions(options)),

    (tree: Tree) => {
      extensions = getExtensions(tree, options);
      componentInfo = parseComponentInfo(tree, options);
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.nsOnly) {
        // return renameWebTemplate(tree, component.templatePath);
        // don't do anything to the template file, as it its content will be replaced in the next step
        return;
      }
      if (platformUse.useWeb) {
        return renameWebTemplate(tree, componentInfo.templatePath);
      } else {
        return removeWebTemplate(tree, context, componentInfo.templatePath);
      }
    },

    () => {
      if (platformUse.useNs) {
        return insertModuleId(componentInfo.classPath);
      }
    },

    (tree: Tree, context: SchematicContext) => {
      if (platformUse.nsOnly) {
        tree.overwrite(componentInfo.templatePath, `<Button text="${componentInfo.name} works!"></Button>`);
        return tree;
      }

      if (platformUse.useNs) {
        // return performNsModifications(component)(tree, context);
        return addNativeScriptFiles(componentInfo)(tree, context);
      }
    }
  ]);
};

const validateOptions = (platformUse: PlatformUse, options: ComponentOptions) =>
  () => {
  if (platformUse.webReady && options.inlineTemplate) {
    throw new SchematicsException('You cannot use the --inlineTemplate option for web+ns component!');
  }

  if (!options.nativescript && !options.web) {
    throw new SchematicsException(`You shouldn't disable both --web and --nativescript flags`);
  }

  if (!platformUse.useNs && !platformUse.useWeb) {
    if(options.nativescript) {
      throw new SchematicsException(`Project is not configured for NativeScript, while --web is set to false`);
    }
    
    if (options.web) {
      throw new SchematicsException(`Project is not configured for Angular Web, while --nativescript is set to false`);
    }
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
  // tree.delete(templatePath);
  filter(
    (path: Path) => !path.match(templatePath)
  )(tree, context)

// const performNsModifications = (component: ComponentInfo) =>
//   (tree: Tree, context: SchematicContext) => {
//     insertModuleId(component.classPath)(tree);
//     return addNativeScriptFiles(component)(tree, context);
//   }

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

  return branchAndMerge(
    mergeWith(templateSource),
  );
};

