import { Schema as MigrationOptions } from './schema';
import { Extensions, getSourceFile } from '../utils';
import {
  Rule,
  chain,
  SchematicsException,
  Tree,
  SchematicContext,
  apply,
  url,
  template,
  branchAndMerge,
  mergeWith
} from '@angular-devkit/schematics';
import { getAngularProjectSettings, AngularProjectSettings } from './angular-project-parser';
import { renameFilesForce, insertTextWhere, getFileContents, findMissingJsonProperties } from './utils';
import { findNode } from './ast-utils';

import * as ts from 'typescript';
import { dasherize } from '@angular-devkit/core/src/utils/strings';

const webpackConfigPath = 'webpack.config.js';
let extensions: Extensions;
let projectSettings: AngularProjectSettings;


export default function (options: MigrationOptions): Rule {
  extensions = {
    ns: (options.nsExtension.length > 0) ? '.' + options.nsExtension : '',
    web: (options.webExtension.length > 0) ? '.' + options.webExtension : ''
  };
  return chain([
    validateOptions(options),
    getProjectSettings,
    applyNsExtensionToCoreFiles,
    updateWebpackConfig,
    updateMainTns,
    mergeNgProjectSettings,
    addWebFiles(),
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
const getProjectSettings = (tree, context) => {
  projectSettings = getAngularProjectSettings(tree, context);
};
/**
 * rename: app.module.ts -> app.module.tns.ts
 * rename: main.ts -> main.tns.ts
 * rename: app.component.html -> app.component.tns.html
 * rename: app.component.ts -> app.component.tns.ts ???
 * rename: tsconfig.json -> tsconfig.tns.json
*/
const applyNsExtensionToCoreFiles = (tree: Tree) => {
  const entryComponentHtmlPath = projectSettings.entryComponentPath.replace('.ts', '.html');
  const filesToApplyPathsTo = [
    projectSettings.mainPath,
    // Should we even rename the app.component.ts to app.component.tns.ts?
    projectSettings.entryModulePath,
    projectSettings.entryComponentPath,
    entryComponentHtmlPath,
    'tsconfig.json'
  ];
  const paths = filesToApplyPathsTo.map(path => {
    return { from: path, to: addExtension(path, extensions.ns) };
  });
  renameFilesForce(paths)(tree);
};
function addExtension(path: string, extension: string) {
  const index = path.lastIndexOf('.');
  const newPath = path.slice(0, index) + extension + path.slice(index);
  return newPath;
}
/**
 * update webpack.config referenes:
 * - main.ts -> bundle: "./main.tns.ts",
 * - tsconfig.json -> tsConfigPath: "tsconfig.tns.json"
 * - app.module -> app.module.tns#AppModule
 */
const updateWebpackConfig = (tree: Tree) => {
  updateMainTsExtension(tree);
  updateTsConfigExtension(tree);
  updateEntryModuleExtension(tree);
  return tree;
};
/**
 * Find bundle in webpack.config.js
 * If the value is:  bundle: "./main.ts",
 * then update it to bundle: "./main.tns.ts"
 */
function updateMainTsExtension(tree) {
  const source = getSourceFile(tree, webpackConfigPath);
  // const fileToUpdate = 'main.ts'; // TODO: this should come from settings
  const fileToUpdate = projectSettings.mainName + '.ts';

  const node = findNode(source, [
    { kind: ts.SyntaxKind.VariableDeclaration, name: 'config' },
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'entry' },
    { kind: ts.SyntaxKind.PropertyAssignment, name: 'bundle' }
  ], fileToUpdate);

  const updatedFilePath = insertTextWhere(fileToUpdate, extensions.ns, '.ts');
  replaceTextInNode(tree, node, fileToUpdate, updatedFilePath);
}

/**
 * Find tsConfigPath in webpack.config.js
 * If the value is   tsConfigPath: "./tsconfig.json"
 * then update it to tsConfigPath: "./tsconfig.tns.json"
 */
function updateTsConfigExtension(tree: Tree) {
    const source = getSourceFile(tree, webpackConfigPath);
    const fileToUpdate = 'tsconfig.json';

    const node = findNode(source, [
        { kind: ts.SyntaxKind.VariableDeclaration, name: 'ngToolsWebpackOptions' },
        { kind: ts.SyntaxKind.PropertyAssignment, name: 'tsConfigPath' }
    ], fileToUpdate);

    const updatedFilePath = insertTextWhere(fileToUpdate, extensions.ns, '.json');
    replaceTextInNode(tree, node, fileToUpdate, updatedFilePath);
}

/**
 * Find entryModule in webpack.config.js
 * If the value is   entryModule: resolve(__dirname, "app/app.module#AppModule"),
 * then update it to entryModule: resolve(__dirname, "app/app.module.tns#AppModule"),
 */
function updateEntryModuleExtension(tree: Tree) {
    const source = getSourceFile(tree, webpackConfigPath);
    // const propertyText = 'module#AppModule';
    const propertyText = `module#${projectSettings.entryModuleName}`;

    const node = findNode(source, [
        { kind: ts.SyntaxKind.NewExpression, name: 'nsWebpack.NativeScriptAngularCompilerPlugin' },
        { kind: ts.SyntaxKind.PropertyAssignment, name: 'entryModule' },
    ], propertyText);

    // const updatedFilePath = insertTextWhere(fileToUpdate, extensions.ns, '#AppModule');
    const updatedFilePath = insertTextWhere(propertyText, extensions.ns, `#${projectSettings.entryModuleName}`);
    replaceTextInNode(tree, node, propertyText, updatedFilePath);
}

function replaceTextInNode(tree: Tree, node: ts.Node, from: string, to: string) {
    const index = node.getStart() + node.getText().indexOf(from);
    const recorder = tree.beginUpdate(node.getSourceFile().fileName);
    recorder.remove(index, from.length);
    recorder.insertLeft(index, to);
    tree.commitUpdate(recorder);
}
const createNgProject = () => (tree: Tree, context: SchematicContext) => {
    const options = {
        name: 'tmp-name',
        directory: 'tmp',
        sourceDir: projectSettings.appRoot,
        skipInstall: true
    };
    // return externalSchematic('@schematics/angular', 'application', options);
    return fakeCreateNgProject(options)(tree, context);
};
const fakeCreateNgProject = (options) => {
    const templateSource = apply(url('./_ngproject'), [
        template({
            dot: '.',
            name: options.name,
            directory: options.directory,
            sourceDir: options.sourceDir
        })
    ]);
    return branchAndMerge(mergeWith(templateSource));
};
/**
 * merges ng project properties into {N} projects properties:
 *  .angular-cli.json, .gitignore and package.json
 */
const mergeFiles = (tree: Tree) => {
    mergeGitIgnore(tree);
    mergeAngularCliJson(tree);
    mergePackageJson(tree);
};
function mergeGitIgnore(tree: Tree) {
    const webLines = getFileContents(tree, '/tmp/.gitignore').split('\n');
    const nsLines = getFileContents(tree, '.gitignore').split('\n');
    const recorder = tree.beginUpdate('.gitignore');

    recorder.insertLeft(0, '#----WEB Settings ----\n');
    webLines.forEach(webLine => {
        if (nsLines.includes(webLine) === false) {
            recorder.insertLeft(0, webLine + '\n');
        }
    });

    recorder.insertLeft(0, '\n#----NS Settings ----\n');
    tree.commitUpdate(recorder);
}

/**
 * Open .angular-cli.json for {N} and Web project and merge:
 * apps, defaults and the remaining properties
 */
function mergeAngularCliJson(tree: Tree) {
    const webAngularCliJson = JSON.parse(getFileContents(tree, '/tmp/.angular-cli.json'));
    const nsAngularCliJson = JSON.parse(getFileContents(tree, '.angular-cli.json'));

    // merge apps
    const missingAppsProperties = findMissingJsonProperties(nsAngularCliJson.apps[0], webAngularCliJson.apps[0]);
    Object.assign(nsAngularCliJson.apps[0], missingAppsProperties);
    
    // merge defaults
    const missingDefaultsProperties = findMissingJsonProperties(nsAngularCliJson.defaults, webAngularCliJson.defaults);
    Object.assign(nsAngularCliJson.defaults, missingDefaultsProperties);
    
    // merge the remaining properties
    // const missingRemainingProperties = findMissingJsonProperties(nsAngularCliJson, webAngularCliJson);
    // Object.assign(nsAngularCliJson, missingRemainingProperties);
    mergeRemainingJsonProperties(nsAngularCliJson, webAngularCliJson);
    
    // save file
    tree.overwrite('.angular-cli.json', JSON.stringify(nsAngularCliJson, null, 2));
}

function mergePackageJson(tree: Tree) {
    const webPackageJson = JSON.parse(getFileContents(tree, '/tmp/package.json'));
    const nsPackageJson = JSON.parse(getFileContents(tree, 'package.json'));

    // find and merge missing dependecies and devDependencies
    mergeDependenciesJSON(nsPackageJson, webPackageJson);

    // TODO: decide - should we merge scripts?
    // find and merge missing scripts
    mergeScriptsJSON(nsPackageJson, webPackageJson);

    // find and merge the remaining properties
    mergeRemainingJsonProperties(nsPackageJson, webPackageJson);

    // const remainingProperties = findMissingJsonProperties(nsPackageJson, webPackageJson);
    // Object.assign(nsPackageJson, remainingProperties);
    tree.overwrite('package.json', JSON.stringify(nsPackageJson, null, 2));
}
/**
 * Scans web package.json dependencies and devDependencies,
 * looking for any missing dependencies in {N} package.json
 * Then adds the missing dependencies from web package.json => {N} package.json
 */
function mergeDependenciesJSON(nsPackageJson: any, webPackageJson: any) {
    // for simplicity bring ns dependencies and devDependencies under one object, so that we could search in both in one go
    const nsDependencies = Object.assign({}, nsPackageJson.dependencies, nsPackageJson.devDependencies);
    
    // find and merge missing dependencies
    const missingDependencies = findMissingJsonProperties(nsDependencies, webPackageJson.dependencies, 
      dependency => console.warn(`Warning: dependency version mismatch in package.json for ${dependency}. ${webPackageJson.dependencies[dependency]} doesn't match ${nsDependencies[dependency]}`));
    
    Object.assign(nsPackageJson.dependencies, missingDependencies);

    // find and merge missing devDependencies
    const missingDevDependencies = findMissingJsonProperties(nsDependencies, webPackageJson.devDependencies, dependency => console.warn(`Warning: devDependency version mismatch in package.json for ${dependency}. ${webPackageJson.devDependencies[dependency]} doesn't match ${nsDependencies[dependency]}`));
    Object.assign(nsPackageJson.devDependencies, missingDevDependencies);
}
/**
* Scans web package.json scripts,
 * looking for any missing scripts in {N} package.json
 * Then adds the missing scripts from web package.json => {N} package.json
 */
function mergeScriptsJSON(nsPackageJson: any, webPackageJson: any) {
    // if ns package.json doesn't have scripts, then assign the ones from web package.json
    if (!nsPackageJson.scripts) {
        nsPackageJson.scripts = webPackageJson.scripts;
        return;
    }

    // find any missing scripts
    const scriptsToAdd = findMissingJsonProperties(nsPackageJson.scripts, webPackageJson.scripts, 
      script => console.warn(`Warning: package.json script ${script} exists in for {N} and default web project`));

    // merge the scripts to add
    Object.assign(nsPackageJson.scripts, scriptsToAdd);
}
const deleteNgProject = (tree: Tree) => {
    tree.visit(file => {
        if (file.startsWith('/tmp')) {
            tree.delete(file);
        }
    });
    return tree;
};

/**
 * renames main.ts to main.tns.ts
 * and updates: import { AppModule } from "./app.module";
 *         to:  import { AppModule } from "./app.module.tns";
 */
// const updateMain = (tree: Tree) => {
//     const importPath = projectSettings.entryModuleImportPath;
//     let fileContent = getFileContents(tree, projectSettings.mainPath);
//     fileContent = fileContent.replace(importPath, importPath + extensions.ns);

//     tree.delete(projectSettings.mainPath);

//     const mainTnsPath = addExtension(projectSettings.mainPath, extensions.ns);
//     tree.create(mainTnsPath, fileContent);
// };

/**
 * Updates the path AppModule import path to ./app.module.tns
 */
const updateMainTns = (tree: Tree) => {
    const mainTnsPath = addExtension(projectSettings.mainPath, extensions.ns);
    const source = getSourceFile(tree, mainTnsPath);
    // const source = getSourceFile(tree, projectSettings.mainPath);
    const importPath = projectSettings.entryModuleImportPath;

    const node = findNode<ts.ImportDeclaration>(source, [
      { kind: ts.SyntaxKind.ImportDeclaration, name: projectSettings.entryModuleName },
    ]);
    replaceTextInNode(tree, node, importPath, importPath + extensions.ns);
};

const mergeNgProjectSettings = chain([
    createNgProject(),
    mergeFiles,
    deleteNgProject
]);

/**
 * Performs a shallow check for missing properties
 */
function mergeRemainingJsonProperties(to: string, from: string) {
  const properties = findMissingJsonProperties(to, from);
  Object.assign(to, properties);
}

const addWebFiles = () => (tree, context) => {
    const templateOptions = {
        dasherize: dasherize,
        // webext: '.www',
        webext: extensions.web,
        appRoot: projectSettings.appRoot,
        main: projectSettings.mainName,
        entryModuleName: projectSettings.entryModuleName,
        entryModulePrefix: projectSettings.entryModuleName.replace('Module', ''),
        entryModuleImportPath: projectSettings.entryModuleImportPath,
        // entryModulePath: projectSettings.entryModulePath.replace(projectSettings.appRoot, '.'),
        entryComponentName: projectSettings.entryComponentName,
        entryComponentPrefix: projectSettings.entryComponentName.replace('Component', ''),
        entryComponentImportPath: projectSettings.entryComponentImportPath,
        // entryComponentPath: projectSettings.entryComponentPath.replace(projectSettings.appRoot, '.'),
        indexAppRootTag: projectSettings.indexAppRootTag,
    };
    const templateSource = apply(url('./_files'), [
        template(templateOptions)
    ]);
    return branchAndMerge(mergeWith(templateSource))(tree, context);
};
