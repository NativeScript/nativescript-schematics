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
  schematic,
  TaskConfigurationGenerator,
  TaskConfiguration,
} from '@angular-devkit/schematics';
import {
  NodePackageInstallTask,
  NodePackageLinkTask,
} from '@angular-devkit/schematics/tasks';
import {
  BuiltinTaskExecutor
} from '@angular-devkit/schematics/tasks/node';

import { dasherize } from '@angular-devkit/core/src/utils/strings';

import { Schema as MigrationOptions } from './schema';
import { Extensions, getJsonFile } from '../utils';
import { getAngularProjectSettings, AngularProjectSettings } from '../migrate-ns/angular-project-parser';
import { settings } from 'cluster';
import { isJSDocPropertyLikeTag } from 'typescript';

let extensions: Extensions;
let projectSettings: AngularProjectSettings;


export default function (options: MigrationOptions): Rule {
  extensions = {
    ns: (options.nsExtension.length > 0) ? '.' + options.nsExtension : '',
    web: (options.webExtension.length > 0) ? '.' + options.webExtension : ''
  };
  return chain([
    validateOptions(options),
    validatePrerequisits,
    getProjectSettings,

    installNpmModules(),

    updatePackageJson,

    addNsFiles(),

    addAppResources(),
  ]);
}

/**
 * Make sure that nsExtension != webExtension
 */
const validateOptions = (options: MigrationOptions) => () => {
  if (options.nsExtension === options.webExtension) {
    throw new SchematicsException(`nsExtension "${options.nsExtension}" and webExtension "${options.webExtension}" should have different values`);
  }
};
const validatePrerequisits = (_tree: Tree) => {
  
}

const getProjectSettings = (tree: Tree, context: SchematicContext) => {
  projectSettings = getAngularProjectSettings(tree, context);
};

const installNpmModules = () => (tree: Tree, context: SchematicContext) => {
  
  
  const dependeciesToAdd = {
    dependencies: {
      "nativescript-angular": "~5.2.0",
      "nativescript-theme-core": "~1.0.4",
      "reflect-metadata": "~0.1.8",
      "tns-core-modules": "~3.4.0"
    },
    devDependecies: {
      "babel-traverse": "6.26.0",
      "babel-types": "6.26.0",
      "babylon": "6.18.0",
      "copy-webpack-plugin": "~4.3.0",
      "css-loader": "~0.28.7",
      "extract-text-webpack-plugin": "~3.0.2",
      "lazy": "1.0.11",
      "nativescript-dev-typescript": "~0.6.0",
      "nativescript-dev-webpack": "^0.9.1",
      "nativescript-worker-loader": "~0.8.1",
      "raw-loader": "~0.5.1",
      "resolve-url-loader": "~2.2.1",
      "uglifyjs-webpack-plugin": "~1.1.6",
      "webpack": "~3.10.0",
      "webpack-bundle-analyzer": "^2.9.1",
      "webpack-sources": "~1.1.0",
      
      "@ngtools/webpack": "1.10.2",

      "typescript": "2.6.2"
    }
  }

  return schematic('npm-install', {
    json: JSON.stringify(dependeciesToAdd)
  })(tree, context);
}

const updatePackageJson = (tree: Tree) => {
  const packageJson: any = getJsonFile(tree, 'package.json');

  packageJson.nativescript = {
    "id": "org.nativescript.ngsample"
  };

  tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
}

const addNsFiles = () => (tree: Tree, context: SchematicContext) => {
  const templateOptions = {
    dasherize: dasherize,

    nsext: extensions.ns,
    sourcedir: projectSettings.appRoot,

    main: projectSettings.mainName,

    entryModuleName: projectSettings.entryModuleName,
    entryModulePrefix: projectSettings.entryModuleName.replace('Module', ''),
    entryModuleImportPath: projectSettings.entryModuleImportPath,

    entryModulePath: projectSettings.entryModulePath,
    // entryModulePath: projectSettings.entryModulePath.replace(projectSettings.appRoot, '.'),
    
    entryComponentName: projectSettings.entryComponentName,
    entryComponentPrefix: projectSettings.entryComponentName.replace('Component', ''),
    entryComponentImportPath: projectSettings.entryComponentImportPath,

    // entryComponentPath: projectSettings.entryComponentPath.replace(projectSettings.appRoot, '.'),
    indexAppRootTag: projectSettings.indexAppRootTag,
  };
  const templateSource = apply(url('./_ns-files'), [
      template(templateOptions)
  ]);
  return branchAndMerge(mergeWith(templateSource))(tree, context);
};

const addAppResources = () => (tree: Tree, context: SchematicContext) => {
  return schematic('app-resources', {
    // path: `${projectSettings.appRoot}/app`,
    // path: 'app',
    path: ''
  })(tree, context);
}
