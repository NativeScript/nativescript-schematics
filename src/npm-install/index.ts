import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  SchematicsException
} from '@angular-devkit/schematics';

import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { Schema as NpmInstallOptions } from './schema';
import { PackageJson, getPackageJson } from '../utils';

interface Dependencies {
  dependencies: NpmPackageInfo[],
  devDependencies: NpmPackageInfo[]
}

interface NpmPackageInfo {
  name: string;
  version: string;
}

export default function(options: NpmInstallOptions): Rule {
  console.log(`*** Installing npm packages ***`);
  console.log(JSON.stringify(options, null, 2));

  return chain([
    (_tree: Tree, context: SchematicContext) => {
      context.logger.warn('Installing npm packages');
    },
    validateInput(options),
    updatePackageJson(options),
    installNpmModules
  ]);
}

const validateInput = (options: NpmInstallOptions) => () => {
  if ((options.dependencies || options.devDependencies) && options.json) {
    throw new SchematicsException('Too many parameters provided to [npm-install] schematic. Use either json, or dependencies with devDependencies, but not all 3 of them');
  }
}

const updatePackageJson = (options: NpmInstallOptions) => (tree: Tree) => {
  // const packageJson: any = getJsonFile(tree, 'package.json');
  const packageJson: PackageJson = getPackageJson(tree);

  let newDependencies = parseDependencies(options);

  addNpmPackages(packageJson.dependencies, newDependencies.dependencies);
  addNpmPackages(packageJson.devDependencies, newDependencies.devDependencies);
  
  checkForDuplicatePackages(packageJson, newDependencies);

  tree.overwrite('package.json', JSON.stringify(packageJson, null, 2));
}

function parseDependencies(options: NpmInstallOptions): Dependencies {
  const result: Dependencies = {
    dependencies: [],
    devDependencies: []
  }
  
  if (options.dependencies) {
    result.dependencies = parseStringToDependencies(options.dependencies);
  }

  if (options.devDependencies) {
    result.devDependencies = parseStringToDependencies(options.devDependencies);
  }

  if (options.json) {
    const json = JSON.parse(options.json);

    result.dependencies = parseObjectToDependencies(json.dependencies);
    result.devDependencies = parseObjectToDependencies(json.devDependencies);
  }

  return result;
}

function parseStringToDependencies(param: string): NpmPackageInfo[] {
  if (!param || param === '') {
    return [];
  }

  const list: string[] = param.replace(' ','').split(',');

  const result: NpmPackageInfo[] = list.map(item => {
    const index = item.lastIndexOf('@');

    if (index === -1) {
      throw new SchematicsException(`invalid value in dependencies ${item}. Expected something like name@version`);
    }

    return {
      name: item.substring(0, index),
      version: item.substring(index + 1)
    }
  });

  return result;  
}

function parseObjectToDependencies(dependencies: Object): NpmPackageInfo[] {
  if (!dependencies) {
    return [];
  }

  const result: NpmPackageInfo[] = [];
  for (let key in dependencies) {
    result.push({
      name: key,
      version: dependencies[key]
    })
  }

  return result;
}

// TODO: check if we need a validation when dependency already exists in a devDependency or vice versa
//       currently: checkForDuplicatePackages, cleans up if that is the case
function addNpmPackages(dependencies: Object, npmPackages: NpmPackageInfo[]) {
  npmPackages.forEach(npmPackage => {
    if (dependencies[npmPackage.name] && dependencies[npmPackage.name] !== npmPackage.version) {
      console.log(`warn: npm package ${npmPackage.name}@${dependencies[npmPackage.name]} already installed. Updating the version to ${npmPackage.version}.`);
    }

    dependencies[npmPackage.name] = npmPackage.version;
  })
}

function checkForDuplicatePackages(packageJson: PackageJson, newDependencies: Dependencies) {
  newDependencies.dependencies.forEach(dep => {
    if (packageJson.devDependencies[dep.name]) {
      console.log(`warn: Dev Dependency ${dep.name}, was moved to dependencies.`);
      delete packageJson.devDependencies[dep.name];
    }
  })
  
  newDependencies.devDependencies.forEach(dep => {
    if (packageJson.dependencies[dep.name]) {
      console.log(`warn: Dependency ${dep.name}, was moved to devDependencies.`);
      delete packageJson.dependencies[dep.name];
    }
  })
}

const installNpmModules = (_tree: Tree, context: SchematicContext) => {
  context.addTask(new NodePackageInstallTask());
}