import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  schematic,
  SchematicsException,
  template,
  mergeWith,
  apply,
  url,
  move,
} from '@angular-devkit/schematics';
import { addProviderToModule } from '@schematics/angular/utility/ast-utils';
import { InsertChange } from '@schematics/angular/utility/change';
import { dasherize, classify } from '@angular-devkit/core/src/utils/strings';
import { dirname, Path } from '@angular-devkit/core';

import { addExtension } from '../utils';
import { getSourceFile } from '../ts-utils';
import { getNsConfigExtension } from '../generate/utils';
import { parseModuleInfo, ModuleInfo } from './module-info-utils';

import { Schema as MigrateComponentSchema } from '../migrate-component/schema';
import { Schema as CommonModuleSchema } from '../generate/common-module/schema';
import { Schema as ConvertRelativeImportsSchema } from '../convert-relative-imports/schema';
import { Schema as MigrateModuleSchema } from './schema';

let nsext: string;
let moduleInfo: ModuleInfo;

export default function(options: MigrateModuleSchema): Rule {
  return chain([
    (tree: Tree) => {
      const nsconfigExtensions = getNsConfigExtension(tree);
      nsext = options.nsext || nsconfigExtensions.ns;

      if (!nsext.startsWith('.')) {
        nsext = '.' + nsext;
      }
    },
    async (tree: Tree, context: SchematicContext) => {
      moduleInfo = await parseModuleInfo(options)(tree, context);
    },

    (tree) => {
      const moduleDir = dirname(moduleInfo.modulePath as Path);

      return addModuleFile(options.name, nsext, moduleDir)(tree);
    },

    (tree, context) => migrateComponents(moduleInfo, options)(tree, context),
    migrateProviders(),

    () => addCommonModuleFile(options, moduleInfo),

    schematic<ConvertRelativeImportsSchema>('convert-relative-imports', options),
  ]);
}

const addCommonModuleFile = (options, modInfo) => {
  const { name } = options;
  const { modulePath } = modInfo;
  const moduleDirectory = dirname(modulePath);
  const commonModuleOptions = {
    name,
    path: moduleDirectory,
  };

  return schematic<CommonModuleSchema>('common-module', commonModuleOptions);
};

const addModuleFile =
  (name: string, nsExtension: string, path: string) =>
    (_tree: Tree) => {
      const templateSource = apply(url('./_ns-files'), [
        template({
          name,
          nsext: nsExtension,
          dasherize,
          classify,
        }),
        move(path),
      ]);

      return mergeWith(templateSource);
    };

const migrateComponents = (modInfo: ModuleInfo, options: MigrateModuleSchema) => {
  const isComponent = (className: string) => className.endsWith('Component');
  const components = modInfo.declarations.filter(({ name }) => isComponent(name));

  return chain(
    components.map((component) => {
      const convertComponentOptions: MigrateComponentSchema = {
        name: component.name,
        modulePath: modInfo.modulePath,
        nsext,
        project: options.project,
        style: options.style,
        skipConvertRelativeImports: true,
      };

      return schematic<MigrateComponentSchema>('migrate-component', convertComponentOptions);
    }),
  );
};

const migrateProviders = () => (tree: Tree) => {
  moduleInfo.providers.forEach((provider) => {
    addProvider(provider.name, provider.importPath)(tree);
  });
};

const addProvider = (providerClassName: string, providerPath: string) => (tree: Tree) => {
  const nsModulePath = addExtension(moduleInfo.modulePath, nsext);
  
  // check if the {N} version of the @NgModule exists
  if (!tree.exists(nsModulePath)) {
    throw new SchematicsException(
      `Module file [${nsModulePath}] doesn't exist.` +
      `Create it if you want the schematic to add ${moduleInfo.className} to its module providers,` +
      `or if you just want to update the component without updating its module, ` +
      `then rerun this command with --skip-module flag`,
    );
  }

  // Get the changes required to update the @NgModule
  const changes = addProviderToModule(
    <any>getSourceFile(tree, nsModulePath),
    // nsModulePath, // <- this doesn't look like it is in use
    '',
    providerClassName,
    providerPath,
    // findRelativeImportPath(nsModulePath, providerPath)
  );
    
  // Save changes
  const recorder = tree.beginUpdate(nsModulePath);
  changes.forEach((change: InsertChange) =>
    recorder.insertRight(change.pos, change.toAdd),
  );
  tree.commitUpdate(recorder);
};
