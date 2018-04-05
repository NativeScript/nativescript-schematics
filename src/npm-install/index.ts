import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  SchematicsException
} from '@angular-devkit/schematics';

import { BuiltinTaskExecutor } from '@angular-devkit/schematics/tasks/node';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { Schema as NpmInstallOptions } from './schema';
import { getJsonFile, PackageJson, getPackageJson } from '../utils';

interface NpmPackageInfo {
  name: string;
  version: string;
}

export default function(options: NpmInstallOptions): Rule {
  console.log(JSON.stringify(options, null, 2));

  return chain([
    updatePackageJson(options),
    installNpmModules
  ]);
}

const updatePackageJson = (options: NpmInstallOptions) => (tree: Tree) => {
  // const packageJson: any = getJsonFile(tree, 'package.json');
  const packageJson: PackageJson = getPackageJson(tree);

  const newDependencies = parseDependencies(options.dependencies);
  const newDevDependencies = parseDependencies(options.devDependencies);

  addNpmPackages(packageJson.dependencies, newDependencies);
  addNpmPackages(packageJson.devDependencies, newDevDependencies);

  checkForDuplicatePackages(packageJson, newDependencies, newDevDependencies);

  tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
}

function parseDependencies(param: string): NpmPackageInfo[] {
  if (!param || param === '') {
    return [];
  }

  const list: string[] = param.replace(' ','').split(',');

  const dependencies: NpmPackageInfo[] = list.map(item => {
    const index = item.lastIndexOf('@');

    if (index === -1) {
      throw new SchematicsException(`invalid value in dependencies ${item}. Expected something like name@version`);
    }

    return {
      name: item.substring(0, index),
      version: item.substring(index + 1)
    }
  });

  return dependencies;  
}

// TODO: check if we need a validation when dependency already exists in a devDependency or vice versa
function addNpmPackages(dependencies: Object, npmPackages: NpmPackageInfo[]) {
  npmPackages.forEach(npmPackage => {
    if (dependencies[npmPackage.name] && dependencies[npmPackage.name] !== npmPackage.version) {
      console.log(`warn: npm package ${npmPackage.name}@${dependencies[npmPackage.name]} already installed. Updating the version to ${npmPackage.version}.`);
    }

    dependencies[npmPackage.name] = npmPackage.version;
  })
}

function checkForDuplicatePackages(packageJson: PackageJson, newDependencies: NpmPackageInfo[], newDevDependencies: NpmPackageInfo[]) {
  newDependencies.forEach(dep => {
    if (packageJson.devDependencies[dep.name]) {
      console.log(`warn: Dev Dependency ${dep.name}, was moved to dependencies.`);
      delete packageJson.devDependencies[dep.name];
    }
  })
  
  newDevDependencies.forEach(dep => {
    if (packageJson.dependencies[dep.name]) {
      console.log(`warn: Dependency ${dep.name}, was moved to devDependencies.`);
      delete packageJson.dependencies[dep.name];
    }
  })
}

const installNpmModules = (tree: Tree, context: SchematicContext) => {
  context.addTask(new NodePackageInstallTask());
}