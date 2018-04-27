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
  TaskId,
} from '@angular-devkit/schematics';
import {
  RunSchematicTask,
} from '@angular-devkit/schematics/tasks';

import { dasherize } from '@angular-devkit/core/src/utils/strings';

import { Schema as MigrationOptions } from './schema';
import { Schema as NpmInstallOptions } from '../npm-install/schema';
import { Schema as UpdateDevWebpackOptions } from '../update-dev-webpack/schema';
import { Extensions, getJsonFile, getPackageJson } from '../utils';
import { getAngularProjectSettings, AngularProjectSettings } from '../angular-project-parser';
import { getAngularSemver, getAngularCLISemver } from '../node-utils';

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

    addNsFiles(),
    addAppResources(),
    addNativeScriptProjectId,

    addNativeScriptSchematicsNpmModule,
    installNpmModules(),

    addWebpackConfigIfRequired(),
    updateDevWebpack(),
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
  context.logger.info('Reading Project Settings');
  projectSettings = getAngularProjectSettings(tree, context);

  context.logger.info(`Project settings:
${JSON.stringify(projectSettings)}`);
};

const addNsFiles = () => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding {N} files');
  const templateOptions = {
    dasherize: dasherize,

    nsext: extensions.ns,
    sourceDir: projectSettings.appRoot,

    main: projectSettings.mainName,

    entryModuleClassName: projectSettings.entryModuleClassName,
    entryModuleName: projectSettings.entryModuleName,
    entryModuleImportPath: projectSettings.entryModuleImportPath,
    
    entryComponentClassName: projectSettings.entryComponentClassName,
    entryComponentName: projectSettings.entryComponentName,
    entryComponentImportPath: projectSettings.entryComponentImportPath,

    indexAppRootTag: projectSettings.indexAppRootTag,

    //TODO: Remove this when .tns parser works
    platform: '.ios'
  };
  const templateSource = apply(url('./_ns-files'), [
      template(templateOptions)
  ]);
  return branchAndMerge(mergeWith(templateSource))(tree, context);
};

const addAppResources = () => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding App_Resources');
  return schematic('app-resources', {
    // path: `${projectSettings.appRoot}/app`,
    // path: 'app',
    path: ''
  })(tree, context);
}

const addNativeScriptProjectId = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding NativeScript Project ID to package.json');
  const packageJson: any = getJsonFile(tree, 'package.json');

  packageJson.nativescript = packageJson.nativescript || {};
  packageJson.nativescript = Object.assign({
    id: 'org.nativescript.ngsample'
  }, packageJson.nativescript);

  tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
}

const addNativeScriptSchematicsNpmModule = (tree: Tree) => {
  const packageJson = getPackageJson(tree);

  if (packageJson.dependencies['@nativescript/schematics']) {
    delete packageJson.dependencies['@nativescript/schematics'];
  }

  packageJson.devDependencies['@nativescript/schematics'] = '^0.0.10';

  tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
}

let npmInstallTaskId: TaskId;
const installNpmModules = () => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Installing npm modules');
  const dependeciesToAdd = {
    dependencies: {
      // "nativescript-angular": "~5.3.0",
      "nativescript-theme-core": "~1.0.4",
      "reflect-metadata": "~0.1.8",
      "tns-core-modules": "~4.0.0"
    },
    devDependencies: {
      // "babel-traverse": "6.26.0",
      // "babel-types": "6.26.0",
      // "babylon": "6.18.0",
      // "lazy": "1.0.11",

      "nativescript-dev-typescript": "~0.7.0",
      "nativescript-dev-webpack": "^0.10.0",

      "typescript": "2.7.2"
    }
  }

  const ngVersion = getAngularSemver(tree);

  if (ngVersion.major === '6') {
    dependeciesToAdd.dependencies["nativescript-angular"] = 'file:nativescript-angular-6.0.0-rc.0.tgz'
  } else {
    dependeciesToAdd.dependencies["nativescript-angular"] = "5.3.0";
  }

  if (getAngularCLISemver(tree).major === '1') {
    console.log('@angular/cli v1 detected');
  } else {
    context.logger.warn('@angular/cli v6+ detected');
  }

  if (getAngularCLISemver(tree).major === '1') {
    Object.assign(dependeciesToAdd.devDependencies, {
      "@ngtools/webpack": "1.10.2",
      "clean-webpack-plugin": "~0.1.19",

      "copy-webpack-plugin": "~4.3.0",
      "css-loader": "~0.28.7",
      "extract-text-webpack-plugin": "~3.0.2",
      "nativescript-worker-loader": "~0.8.1",
      "raw-loader": "~0.5.1",
      "resolve-url-loader": "~2.2.1",
      "uglifyjs-webpack-plugin": "~1.1.6",
      "webpack": "~3.10.0",
      "webpack-bundle-analyzer": "^2.9.1",
      "webpack-sources": "~1.1.0",
    });

    const options: NpmInstallOptions = {
      json: JSON.stringify(dependeciesToAdd)
    }
    return schematic('npm-install', options)(tree, context);
  } else {
    const options: NpmInstallOptions = {
      json: JSON.stringify(dependeciesToAdd)
    }
    const taskId = context.addTask(new RunSchematicTask('@nativescript/schematics', 'npm-install', options));

    // run for the second time, to npm install modules added by nativescript-dev-webpack
    npmInstallTaskId = context.addTask(new RunSchematicTask('@nativescript/schematics', 'npm-install', {}), [taskId]);
  }
}

const addWebpackConfigIfRequired = () => (tree:Tree, context: SchematicContext) => {
  // This is always going to be the case for ng cli before 6.0
  if (!tree.exists('webpack.config.js')) {
    const templateSource = apply(url('./_webpack-files'), []);
    return branchAndMerge(mergeWith(templateSource))(tree, context);
  }
}

const updateDevWebpack = () => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Updating webpack.config.js');
  const options: UpdateDevWebpackOptions = {
    sourceDir: projectSettings.appRoot,
    nsext: extensions.ns,
    entryModulePath: projectSettings.entryModulePath.replace('.ts',''),
    entryModuleClassName: projectSettings.entryModuleClassName,
    main: projectSettings.mainName
  }

  if (getAngularCLISemver(tree).major === '1') {
    return schematic('update-dev-webpack', options)(tree, context);
  } else {
    context.addTask(new RunSchematicTask('', 'update-dev-webpack', options), [npmInstallTaskId]);
  }
}
