import { join, dirname } from 'path';
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
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { dasherize } from '@angular-devkit/core/src/utils/strings';

import { Schema as MigrationOptions } from './schema';
import { getJsonFile, getFileContents, getPackageJson, overwritePackageJson } from '../utils';
import { getAngularProjectSettings, AngularProjectSettings } from '../angular-project-parser';
import { Extensions } from '../generate/utils';

import { Schema as ConvertRelativeImportsSchema } from '../convert-relative-imports/schema';
import { getCompilerOptions } from '../ts-utils';
import { getMappedImportsRuleConfig } from '../mapped-imports-rule-utils';

let extensions: Extensions;
let projectSettings: AngularProjectSettings;

export default function(options: MigrationOptions): Rule {
  extensions = {
    ns: (options.nsExtension.length > 0) ? '.' + options.nsExtension : '',
    web: (options.webExtension.length > 0) ? '.' + options.webExtension : '',
  };

  return chain([
    validateOptions(options),
    getProjectSettings(options.project),

    addNativeScriptSchematics,

    addNsFiles(options),
    options.sample ?
      addSampleFiles() :
      noop(),

    addAppResources(),
    mergeGitIgnore,
    addRunScriptsToPackageJson,
    // addNativeScriptProjectId,

    modifyWebTsconfig,
    modifyTsLintConfig,

    options.skipAutoGeneratedComponent ?
      noop() :
      addSampleComponent(options.nsExtension, options.webExtension, options.project),

    addDependencies(),

    schematic<ConvertRelativeImportsSchema>('convert-relative-imports', options),

    options.skipInstall ?
      noop() :
      (_tree: Tree, context: SchematicContext) => {
        context.addTask(new NodePackageInstallTask());
      },
  ]);
}

/**
 * Make sure that nsExtension != webExtension
 */
const validateOptions = (options: MigrationOptions) => () => {
  if (options.nsExtension === options.webExtension) {
    throw new SchematicsException(
      `nsExtension "${options.nsExtension}" and webExtension "${options.webExtension}" should have different values`,
    );
  }
};

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

  angularJson.cli = { defaultCollection };

  tree.overwrite('angular.json', JSON.stringify(angularJson, null, 2));
};

const addNsFiles = (options: MigrationOptions) => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding {N} files');
  const templateOptions = {
    sample: options.sample,
    skipAutoGeneratedComponent: options.skipAutoGeneratedComponent,
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

    indexAppRootTag: projectSettings.indexAppRootTag,
  };
  const templateSource = apply(url('./_ns-files'), [
    template(templateOptions),
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
    prefix: projectSettings.prefix,
  };
  const path = join(projectSettings.sourceRoot, 'app');

  const templateSource = apply(url('./_sample-files'), [
    template(templateOptions),
    move(path),
  ]);

  return mergeWith(templateSource);
};

const addSampleComponent = (nsExtension: string, webExtension: string, project: string) =>
  (_tree, context: SchematicContext) => {
    context.logger.info('Adding Sample Shared Component');

    return schematic('component', {
      nsExtension,
      webExtension,
      web: true,
      nativescript: true,
      name: 'auto-generated',
      module: 'app',
      prefix: projectSettings.prefix,
      spec: false,
      project,
    });
  };

const addAppResources = () => (_tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding App_Resources');

  return schematic('app-resources', {
    path: '',
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
  ].filter((line) => !gitignore.includes(line));

  const nsGitignoreContent =
    `# NativeScript` +
    nsGitignoreItems.join('\n') +
    '\n';

  // Update .gitignore
  const recorder = tree.beginUpdate(GITIGNORE);
  recorder.insertLeft(0, nsGitignoreContent);

  tree.commitUpdate(recorder);
};

const addRunScriptsToPackageJson = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding NativeScript run scripts to package.json');

  const packageJson = getPackageJson(tree);

  const scriptsToAdd = {
    android: 'ns run android --no-hmr',
    ios: 'ns run ios --no-hmr',
    mobile: 'ns run',
    // preview: 'ns preview',
    // ngcc: 'ngcc --properties es2015 module main --first-only',
    // postinstall: 'npm run ngcc',
  };
  packageJson.scripts = {...scriptsToAdd, ...packageJson.scripts};

  overwritePackageJson(tree, packageJson);
};

const addNativeScriptProjectId = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding NativeScript Project ID to package.json');
  const packageJson: any = getJsonFile(tree, 'package.json');

  packageJson.nativescript = packageJson.nativescript || {};
  packageJson.nativescript = {
    id: 'org.nativescript.ngsample', ...packageJson.nativescript};

  tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
};

const modifyTsLintConfig = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Modifying tslint.json');

  const tsLintConfigPath = 'tslint.json';
  let tsLintConfig;
  try {
    tsLintConfig = getJsonFile(tree, tsLintConfigPath);
  } catch (e) {
    context.logger.warn('Failed to update tslint.json.');
    context.logger.debug(e.message);

    return;
  }

  tsLintConfig.extends = tsLintConfig.extends || [];
  if (typeof tsLintConfig.extends === 'string') {
    tsLintConfig.extends = [
      tsLintConfig.extends,
    ];
  }
  tsLintConfig.extends.push('@nativescript/tslint-rules');

  tsLintConfig.rules = tsLintConfig.rules || {};
  const ruleConfig = getRuleConfig(tree);
  if (!ruleConfig) {
    context.logger.warn('Failed to update tslint.json.');
    context.logger.debug('Failed to construct tslint rule configuration.');

    return;
  }

  const { name, options } = ruleConfig;
  tsLintConfig.rules[name] = options;

  tree.overwrite(tsLintConfigPath, JSON.stringify(tsLintConfig, null, 2));
};

const getRuleConfig = (tree: Tree) => {
  const tsConfigPath = projectSettings.tsConfig || 'tsconfig.json';
  const compilerOptions = getCompilerOptions(tree, tsConfigPath);
  if (!compilerOptions) {
    return;
  }

  const ruleConfig = getMappedImportsRuleConfig(compilerOptions);

  return ruleConfig;
};

/**
 * Add web-specific path mappings and files
 */
const modifyWebTsconfig = (tree: Tree, context: SchematicContext) => {
  context.logger.info('Modifying web tsconfig');

  const tsConfigPath = projectSettings.tsConfig;
  const tsConfig: any = getJsonFile(tree, tsConfigPath);

  const srcDir = projectSettings.sourceRoot;

  // add list of entry "files"
  const defaultFiles = [
    `${srcDir}/main.ts`,
    `${srcDir}/polyfills.ts`,
  ];

  tsConfig.files = tsConfig.files || [];
  tsConfig.files.push(...defaultFiles);

  // remove "include" property
  // because it overrides "files"
  delete tsConfig.include;

  // paths
  const webPaths = {
    '@src/*': [
      `${srcDir}/*.web`,
      `${srcDir}/*`],
  };
  tsConfig.compilerOptions = tsConfig.compilerOptions || {};
  tsConfig.compilerOptions.paths = {
    ...tsConfig.compilerOptions.paths,
    ...webPaths,
  };

  tree.overwrite(tsConfigPath, JSON.stringify(tsConfig, null, 2));

  if (!tsConfig.extends) {
    return;
  }

  const baseTsConfigPath = join(dirname(tsConfigPath), tsConfig.extends);
  const baseTsConfig: any = getJsonFile(tree, baseTsConfigPath);

  const basePaths = {
    '@src/*': [
      `${srcDir}/*.android.ts`,
      `${srcDir}/*.ios.ts`,
      `${srcDir}/*.tns.ts`,
      `${srcDir}/*.web.ts`,
      `${srcDir}/*`],
  };

  baseTsConfig.compilerOptions = baseTsConfig.compilerOptions || {};
  baseTsConfig.compilerOptions.paths = {
    ...baseTsConfig.compilerOptions.paths,
    ...basePaths,
  };

  tree.overwrite(baseTsConfigPath, JSON.stringify(baseTsConfig, null, 2));
};

const addDependencies = () => (tree: Tree, context: SchematicContext) => {
  context.logger.info('Adding npm dependencies');
  const packageJson = getPackageJson(tree);

  // add {N} 7 main key
  (<any>packageJson).main = 'main.tns.js';

  // @UPGRADE: Update all versions whenever {N} version updates
  const depsToAdd = {
    '@nativescript/angular': '~10.1.0',
    '@nativescript/core': '~7.0.0',
    '@nativescript/theme': '~2.5.0',
    'reflect-metadata': '~0.1.12',
    tslib: '1.10.0',
  };
  packageJson.dependencies = {...depsToAdd, ...packageJson.dependencies};

  const devDepsToAdd = {
    '@nativescript/webpack': '~3.0.0',
    '@nativescript/tslint-rules': '~0.0.5',
  };
  packageJson.devDependencies = {...devDepsToAdd, ...packageJson.devDependencies};

  overwritePackageJson(tree, packageJson);
};
