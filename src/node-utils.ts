import { Tree, SchematicsException } from "@angular-devkit/schematics";
import { getPackageJson } from "./utils";

export class Semver {
  constructor(
    public major: string,
    public minor: string,
    public patch: string
  ) {}
}

export const getAngularSemver = (tree: Tree): Semver => {
  return getModuleSemver(tree, '@angular/core');
}

export const getAngularCLISemver = (tree: Tree): Semver => {
  return getModuleSemver(tree, '@angular/cli');
}

export const getModuleSemver = (tree: Tree, moduleName: string): Semver => {
  const packageJson = getPackageJson(tree);

  const moduleVersion = packageJson.dependencies[moduleName] || packageJson.devDependencies[moduleName];

  const result = parseSemver(moduleVersion);

  if (!result) {
    throw new SchematicsException(`Angular Project Parser, cannot parse the current ${moduleName} version [${moduleVersion}]`);
  }

  return result;
}

const parseSemver = (moduleVersion: string): Semver | null => {
  const match = moduleVersion.match('[0-9]+\.[0-9]+\.[0-9]+');
  if (!match) {
    return null;
  }

  const ver = match[0].split('.');
  return new Semver(ver[0], ver[1], ver[2]);
}