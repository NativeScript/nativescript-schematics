import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  SchematicsException,
  apply,
  url,
  template,
  mergeWith,
  schematic,
} from '@angular-devkit/schematics';
import {
  RunSchematicTask,
} from '@angular-devkit/schematics/tasks';

import { dasherize } from '@angular-devkit/core/src/utils/strings';

import { Schema as MigrationOptions } from './schema';
import { Schema as NpmInstallOptions } from '../npm-install/schema';
import { getJsonFile, getFileContents } from '../utils';
import { getAngularProjectSettings, AngularProjectSettings } from '../angular-project-parser';
import { Extensions } from '../generate/utils';

let extensions: Extensions;
let projectSettings: AngularProjectSettings;

export default function (options: MigrationOptions): Rule {
  extensions = {
    ns: (options.nsExtension.length > 0) ? '.' + options.nsExtension : '',
    web: (options.webExtension.length > 0) ? '.' + options.webExtension : ''
  };

  return chain([
    validateOptions(options),

    getProjectSettings(options.project),
    validateProjectSettings,

    addNativeScriptSchematics,

    addNsFiles(),
    addAppResources(),
    mergeGitIgnore,
    addRunScriptsToPackageJson,
    addNativeScriptProjectId,

    addWebpackConfig(),

    installNpmModules()
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

/**
 * This schematic should only be used with ng/cli v6+
 */
const validateProjectSettings = (_tree: Tree) => {
  const cliVer = projectSettings.ngCliSemVer;

  if (cliVer.major < 6) {
    throw new SchematicsException(`@angular/cli ${cliVer.toString()} version detected. Upgrade to 6.0 or newer.`);
  }
}

const getProjectSettings = (projectName: string) => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Reading Project Settings');
  projectSettings = getAngularProjectSettings(tree, projectName);

  context.logger.info(`Project settings:
${JSON.stringify(projectSettings, null, 2)}`);
};

const addNativeScriptSchematics = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding @nativescript/schematics to angular.json');

  const angularJson: any = getJsonFile(tree, 'angular.json');

  const defaultCollection = '@nativescript/schematics';

  if (angularJson.cli && angularJson.cli.defaultCollection !== defaultCollection) {
    context.logger.warn(`Changing default schematics collection
${JSON.stringify(angularJson.cli, null, 2)}
  to:
${JSON.stringify(angularJson.cli, null, 2)}`);
  }

  angularJson.cli = {
    'defaultCollection' : defaultCollection
  }

  tree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));
}

const addNsFiles = () => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding {N} files');
  const templateOptions = {
    dasherize: dasherize,

    nsext: extensions.ns,
    webext: extensions.web,
    sourceDir: projectSettings.sourceRoot,

    main: projectSettings.mainName,

    entryModuleClassName: projectSettings.entryModuleClassName,
    entryModuleName: projectSettings.entryModuleName,
    entryModuleImportPath: projectSettings.entryModuleImportPath,
    
    entryComponentClassName: projectSettings.entryComponentClassName,
    entryComponentName: projectSettings.entryComponentName,
    entryComponentImportPath: projectSettings.entryComponentImportPath,

    indexAppRootTag: projectSettings.indexAppRootTag
  };
  const templateSource = apply(url('./_ns-files'), [
      template(templateOptions)
  ]);
  return mergeWith(templateSource);
};

const addAppResources = () => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding App_Resources');
  return schematic('app-resources', {
    path: ''
  });
}

/**
 * Adds NativeScript specific ignores to .gitignore
 */
const mergeGitIgnore = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding NativeScript specific exclusions to .gitignore');
  
  if (!tree.exists('.gitignore')) {
    tree.create('.gitignore', '');
  }
  const gitignore = getFileContents(tree, '/.gitignore').split('\n');

  // Prepare NativeScript .gitignore lines
  let nsGitignoreContent = [
    'node_modules/',
    'platforms/',
    'hooks/',
    `${projectSettings.sourceRoot}/**/*.js`,
  ];
  
  // Remove any lines that are already in the .gitignore
  nsGitignoreContent = nsGitignoreContent.filter(
    nsLine => !gitignore.includes(nsLine)
  );

  // Prepare content to add to .gitignore
  const content = `# NativeScript
${nsGitignoreContent.join('\n')}

`;

  // Add content to .gitignore
  const recorder = tree.beginUpdate('.gitignore');
  recorder.insertLeft(0, content);

  tree.commitUpdate(recorder);
}

/**
 * Adds {N} npm run scripts to package.json
 * npm run ios => tns run ios --bundle
 * npm run android => tns run android --bundle
 */
const addRunScriptsToPackageJson = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding NativeScript run scripts to package.json');
  const packageJson: any = getJsonFile(tree, 'package.json');

  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts = Object.assign({
    android: 'tns run android --bundle',
    ios: 'tns run ios --bundle'
  }, packageJson.scripts);

  tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
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

// let npmInstallTaskId: TaskId;
const installNpmModules = () => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Installing npm modules');

  // @UPGRADE: Update all versions whenever {N} version updates
  const dependeciesToAdd = {
    dependencies: {
      'nativescript-angular': '^6.0.0',
      'nativescript-theme-core': '~1.0.4',
      'reflect-metadata': '~0.1.8',
      'tns-core-modules': '~4.1.0'
    },
    devDependencies: {
      'nativescript-dev-webpack': '^0.14.0'
    }
  }

  const options: NpmInstallOptions = {
    json: JSON.stringify(dependeciesToAdd),
    workingDirectory: ''
  }

  context.addTask(new RunSchematicTask('@nativescript/schematics', 'npm-install', options));
}

const addWebpackConfig = () => (tree:Tree) => {
  const templateOptions = {
    entryModuleClassName: projectSettings.entryModuleClassName,
    entryModuleImportPath: projectSettings.entryModuleImportPath,
    nsext: extensions.ns,
    shortExt: extensions.ns.replace('.', '')
  }

  // This is always going to be the case for ng cli before 6.0
  if (!tree.exists('webpack.config.js')) {
    const templateSource = apply(url('./_webpack-files'), [
      template(templateOptions)
    ]);
    return mergeWith(templateSource);
  } else {
    throw new SchematicsException('Failed at addWebpackConfig step. webpack.config.js already exists.');
  }
}

// const updateDevWebpack = () => (tree: Tree, context: SchematicContext) => {
//   context.logger.info('Updating webpack.config.js');
//   const options: UpdateDevWebpackOptions = {
//     nsext: extensions.ns
//   }

//   if (projectSettings.ngCliSemVer.major === 1) {
//     return schematic('update-dev-webpack', options)(tree, context);
//   } else {
//     context.addTask(new RunSchematicTask('@nativescript/schematics', 'update-dev-webpack', options), [npmInstallTaskId]);
//   }
// }
