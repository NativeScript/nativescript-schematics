import { Schema as MigrateModuleSchema } from './schema';

import { dasherize, classify, } from '@angular-devkit/core/src/utils/strings';
import { SchematicsException, Tree, SchematicContext } from '@angular-devkit/schematics';
import { join } from 'path';

import { AngularProjectSettings, getAngularProjectSettings } from '../angular-project-parser';
import { ClassImport, getNgModuleProperties } from '../decorator-utils';

export interface ModuleInfo {
  className: string;
  modulePath: string;
  providers: ClassImport[];
  declarations: ClassImport[];
}

let projectSettings: AngularProjectSettings;

export const parseModuleInfo = (options: MigrateModuleSchema) => (tree: Tree, context: SchematicContext): ModuleInfo => {
  projectSettings = getAngularProjectSettings(tree, options.project);

  const className = classify(`${options.name}Module`);
  const modulePath = findModulePath(options, tree);

  const providers = getNgModuleProperties(modulePath, className, 'providers', tree);
  const declarations = getNgModuleProperties(modulePath, className, 'declarations', tree);

  const moduleInfo: ModuleInfo = {
    className,
    modulePath,
    providers,
    declarations
  }

  context.logger.info(`ModuleInfo
  ${JSON.stringify(moduleInfo, null, 2)}`);

  return moduleInfo;
}

const findModulePath = (options: MigrateModuleSchema, tree: Tree): string => {
  let modulePath = '';

  // When module Path provided, check if it is correct
  if (options.modulePath) {
    modulePath = join(projectSettings.sourceRoot, 'app', options.modulePath);

    if (!tree.exists(modulePath)) {
      throw new SchematicsException(`Invalid --modulePath: ${options.modulePath}
  File cannot be found at ${modulePath}
  Expecting something like: module-name/module-name.module.ts`);
    }
  }
  // When a specified Module has been provided
  else {
    modulePath = join(
      projectSettings.sourceRoot,             // src/
      'app',                                  // app/
      dasherize(options.name),                // some-name/
      dasherize(options.name) + '.module.ts'  // some-name.module.ts
    );

    if (!tree.exists(modulePath)) {
      throw new SchematicsException(`Couldn't find the module at: ${modulePath}`);
    }
  }

  return modulePath;
}
