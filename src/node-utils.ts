import { Tree, SchematicsException } from '@angular-devkit/schematics';
import { getPackageJson, safeGet } from './utils';

export class SemVer {
  constructor(
    public major: number,
    public minor: number,
    public patch: number,
    public tag: string | null = null
  ) {}

  toString() {
    const ver = `${this.major}.${this.minor}.${this.patch}`;

    return (this.tag) ? `${ver}-${this.tag}` : ver;
  }
}

export const getAngularSemver = (tree: Tree): SemVer => {
  return getModuleSemver(tree, '@angular/core');
}

export const getAngularCLISemver = (tree: Tree): SemVer => {
  return getModuleSemver(tree, '@angular/cli');
}

export const getModuleSemver = (tree: Tree, moduleName: string): SemVer => {
  const packageJson = getPackageJson(tree);

  const moduleVersion = safeGet(packageJson, 'dependencies', moduleName) ||
    safeGet(packageJson, 'devDependencies', moduleName);

  const result = moduleVersion && parseSemver(moduleVersion);

  if (!result) {
    throw new SchematicsException(`Angular Project Parser, cannot parse the current ${moduleName} version [${moduleVersion}]`);
  }

  return result;
}

const parseSemver = (moduleVersion: string): SemVer | null => {
  const match = moduleVersion.match('[0-9]+\.[0-9]+\.[0-9]+');
  if (!match) {
    return null;
  }

  const parts = match[0].split('.');

  if (parts[2].indexOf('-')) {
    const patchTag = parts[2].split('-');

    return new SemVer(
      Number.parseInt(parts[0]),
      Number.parseInt(parts[1]),
      Number.parseInt(patchTag[0]),
      patchTag[1]
    );
  }

  return new SemVer(
    Number.parseInt(parts[0]),
    Number.parseInt(parts[1]),
    Number.parseInt(parts[2])
  );
}