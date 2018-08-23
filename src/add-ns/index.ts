import { join } from 'path';
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
  noop,
  move,
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

    addNsFiles(options),
    options.sample ?
      addSampleFiles() :
      noop(),

    addAppResources(),
    mergeGitIgnore,
    addRunScriptsToPackageJson,
    addNativeScriptProjectId,
    excludeNsFilesFromTsconfig,
    addHomeComponent(options.nsExtension, options.webExtension, options.project),

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

  angularJson.cli = { 'defaultCollection': defaultCollection };

  tree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));
}

const addNsFiles = (options: MigrationOptions) => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding {N} files');
  const templateOptions = {
    sample: options.sample,
    theme: true,

    dasherize,
    nsext: extensions.ns,
    webext: extensions.web,
    sourceDir: projectSettings.sourceRoot,
    prefix: projectSettings.prefix,

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

const addSampleFiles = () => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding sample files');
  const templateOptions = {
    nsext: extensions.ns,
    webext: extensions.web,
    sourceDir: projectSettings.sourceRoot,

    indexAppRootTag: projectSettings.indexAppRootTag,
  };
  const path = join(projectSettings.sourceRoot, 'app');

  const templateSource = apply(url('./_sample-files'), [
    template(templateOptions),
    move(path),
  ]);

  return mergeWith(templateSource);
};

const addHomeComponent = (nsExtension: string, webExtension: string, project: string) =>
  (_tree, context: SchematicContext) => {
    context.logger.info('Adding Shared Home Component');

    return schematic('component', {
      nsExtension: nsExtension,
      webExtension: webExtension,
      web: true,
      nativescript: true,
      name: 'home',
      module: 'app',
      inlineStyle: true,
      prefix: projectSettings.prefix,
      spec: false,
      project,
    });
  };

const addAppResources = () => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding App_Resources');
  return schematic('app-resources', {
    path: ''
  });
};

/**
 * Adds NativeScript specific ignores to .gitignore
 */
const mergeGitIgnore = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding NativeScript specific exclusions to .gitignore');

  // Read existing .gitignore file
  const GITIGNORE = '.gitignore';
  if (!tree.exists(GITIGNORE)) {
    tree.create(GITIGNORE, '');
  }
  const gitignore = getFileContents(tree, `/${GITIGNORE}`).split('\n');

  // Prepare {N} ignore items
  const nsGitignoreItems = [
    'node_modules/',
    'platforms/',
    'hooks/',
    `${projectSettings.sourceRoot}/**/*.js`,
  ].filter(line => !gitignore.includes(line));

  const nsGitignoreContent =
    `# NativeScript` +
    nsGitignoreItems.join('\n') +
    '\n';

  // Update .gitignore
  const recorder = tree.beginUpdate(GITIGNORE);
  recorder.insertLeft(0, nsGitignoreContent);

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

/**
 * Adds {N}-specific extensions
 * to the list with excluded files
 * in the web TypeScript configuration
 */
const excludeNsFilesFromTsconfig = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Excluding NativeScript files from web tsconfig');

  const nsExtensions = [
    `**/*${extensions.ns}.ts`,
    '**/*.android.ts',
    '**/*.ios.ts',
  ];

  const tsConfigPath = projectSettings.tsConfig;
  const tsConfig: any = getJsonFile(tree, tsConfigPath);

  tsConfig.exclude = tsConfig.exclude || [];
  tsConfig.exclude = [...tsConfig.exclude, ...nsExtensions];

  tree.overwrite(tsConfigPath, JSON.stringify(tsConfig, null, 2));
}

// let npmInstallTaskId: TaskId;
const installNpmModules = () => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Installing npm modules');

  // @UPGRADE: Update all versions whenever {N} version updates
  const dependeciesToAdd = {
    dependencies: {
      'nativescript-angular': '~6.1.0',
      'nativescript-theme-core': '~1.0.4',
      'reflect-metadata': '~0.1.8',
      'tns-core-modules': '~4.2.0'
    },
    devDependencies: {
      'nativescript-dev-webpack': 'rc'
    }
  }

  const options: NpmInstallOptions = {
    json: JSON.stringify(dependeciesToAdd),
    workingDirectory: ''
  }

  context.addTask(new RunSchematicTask('@nativescript/schematics', 'npm-install', options));
}

