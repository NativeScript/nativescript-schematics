import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  schematic,
  SchematicsException,
} from '@angular-devkit/schematics';
import { addProviderToModule } from '@schematics/angular/utility/ast-utils';
import { InsertChange } from '@schematics/angular/utility/change';

import { addExtension } from '../utils';
import { getSourceFile } from '../ts-utils';
import { getNsConfigExtension } from '../generate/utils';
import { parseModuleInfo, ModuleInfo } from './module-info-utils';

import { Schema as ModuleSchema } from '../generate/module/schema';
import { Schema as MigrateComponentSchema } from '../migrate-component/schema';
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
    (tree: Tree, context: SchematicContext) => {
      moduleInfo = parseModuleInfo(options)(tree, context);
    },

    addModuleFile(options.name, options.project),

    (tree, context) => migrateComponents(moduleInfo, options)(tree, context),
    migrateProviders(),

    schematic<ConvertRelativeImportsSchema>('convert-relative-imports', options),
  ]);
}

const addModuleFile =
  (name: string, project: string) =>
    (tree: Tree, context: SchematicContext) =>
      schematic('module', {
        name,
        project,
        nsExtension: nsext,
        flat: false,
        web: false,
        spec: false,
        common: true,
      })(tree, context);

const migrateComponents = (modInfo: ModuleInfo, options: MigrateModuleSchema) => {
  const components = modInfo.declarations.filter((d) => d.name.endsWith('Component'));

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
    getSourceFile(tree, nsModulePath),
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
