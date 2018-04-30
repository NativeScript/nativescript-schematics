import { Tree, SchematicsException } from "@angular-devkit/schematics";
import { getPackageJson } from "./utils";

export class Semver {
  constructor(
    public major: number,
    public minor: number,
    public patch: number,
    public tag: string | null = null
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

  const parts = match[0].split('.');

  if (parts[2].indexOf('-')) {
    const patchTag = parts[2].split('-');

    return new Semver(
      Number.parseInt(parts[0]),
      Number.parseInt(parts[1]),
      Number.parseInt(patchTag[0]),
      patchTag[1]
    );
  }

  return new Semver(
    Number.parseInt(parts[0]),
    Number.parseInt(parts[1]),
    Number.parseInt(parts[2])
  );
}