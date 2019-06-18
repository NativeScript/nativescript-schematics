import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { getFileContent } from '@schematics/angular/utility/test';
import * as path from 'path';

import { isInModuleMetadata, createEmptyNsOnlyProject } from '../test-utils';
import { Schema } from './schema';

describe('Refactor NsNg Modules Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    path.join(__dirname, '../collection.json'),
  );

  const sourceDir = 'src';
  const defaultOptions: Schema = { sourceDir };

  const rootModulePath = `${sourceDir}/app.module.ts`;
  const rootModuleContent = `
    import { NgModule } from "@angular/core";
    import { NativeScriptModule } from "nativescript-angular/nativescript.module";

    @NgModule({
        imports: [
            NativeScriptModule,
        ],
    })
    export class AppModule { }
  `;

  const initAppTree = () => {
    const appTree = createEmptyNsOnlyProject('project');
    return appTree;
  };

  describe('when no changes are required', () => {
    let appTree;
    beforeEach(() => {
      appTree = createEmptyNsOnlyProject('project');
    });

    it('should not change the tree', async () => {
      const tree = await schematicRunner.runSchematicAsync('refactor-nsng-modules', defaultOptions, appTree)
        .toPromise();
      expect(tree.files.length).toEqual(3);
      expect(tree.exists(rootModulePath)).toEqual(true);
      expect(getFileContent(tree, rootModulePath)).toEqual(rootModuleContent);
    });
  });

  describe('when a feature module has NativeScriptModule imported', () => {
    const featureModuleName = `LoginModule`;
    const featureModulePath = `${sourceDir}/feature.module.ts`;

    let tree;
    let featureModuleContent;

    beforeEach(() => {
      const appTree = initAppTree();
      appTree.create(featureModulePath, `
        import { NativeScriptModule } from "nativescript-angular/nativescript.module";
        import { NativeScriptFormsModule } from "nativescript-angular/forms";
        import { NgModule, NO_ERRORS_SCHEMA } from "@angular/core";

        import { loginRouting } from "./login.routing";
        import { LoginComponent } from "./login.component";


        @NgModule({
          imports: [
            NativeScriptFormsModule,
            NativeScriptModule,
            loginRouting
          ],
          declarations: [
            LoginComponent
          ],
          schemas: [NO_ERRORS_SCHEMA]
        })
        export class ${featureModuleName} { }
      `);

      tree = schematicRunner.runSchematic('refactor-nsng-modules', defaultOptions, appTree);
      featureModuleContent = getFileContent(tree, featureModulePath);
    });

    it('should remove the NativeScriptModule import', () => {
      expect(featureModuleContent).not.toMatch(`NativeScriptModule`);
      expect(featureModuleContent)
        .not.toMatch('import { NativeScriptModule } from "nativescript-angular/nativescript.module";'
      );
    });

    it('should add the NativeScriptCommonModule to the module metadata', () => {
      expect(featureModuleContent)
        .toMatch(
          isInModuleMetadata(featureModuleName, 'imports', 'NativeScriptCommonModule', true)
        );
    });

    it('should not change the root module', () => {
      expect(getFileContent(tree, rootModulePath)).toEqual(rootModuleContent);
    });
  });

  describe('when a feature module has NativeScriptAnimationsModule imported', () => {
    const featureModuleName = `SomeModule`;
    const featureModulePath = `${sourceDir}/nested/dir/some.module.ts`;

    let tree;
    let featureModuleContent;

    beforeEach(() => {
      const appTree = initAppTree();
      appTree.create(featureModulePath, `
        import { NativeScriptAnimationsModule } from "nativescript-angular/animations";
        import { NgModule, NO_ERRORS_SCHEMA } from "@angular/core";

        @NgModule({
          imports: [
            NativeScriptAnimationsModule,
          ],
          schemas: [NO_ERRORS_SCHEMA]
        })
        export class ${featureModuleName} { }
      `);

      tree = schematicRunner.runSchematic('refactor-nsng-modules', defaultOptions, appTree);
      featureModuleContent = getFileContent(tree, featureModulePath);
    });

    it('should remove the NativeScriptAnimationsModule import', () => {
      expect(featureModuleContent).not.toMatch(`NativeScriptAnimationsModule`);
      expect(featureModuleContent)
        .not.toMatch('import { NativeScriptAnimationsModule } from "nativescript-angular/animations";'
      );
    });

    it('should add the animations module to the root module', () => {
      const newRootModuleContent = getFileContent(tree, rootModulePath);
      expect(newRootModuleContent).toMatch(`NativeScriptAnimationsModule`);
      expect(newRootModuleContent)
        .toMatch('import { NativeScriptAnimationsModule } from "nativescript-angular/animations";'
      );
    });
  });

  describe('when a feature module has both NativeScriptModule and NativeScriptAnimationsModule imported', () => {
    const featureModuleName = `FeatureModule`;
    const featureModulePath = `${sourceDir}/dir/feature-1.module.ts`;

    let tree;
    let featureModuleContent;

    beforeEach(() => {
      const appTree = initAppTree();
      appTree.create(featureModulePath, `
        import { NativeScriptModule } from "nativescript-angular/nativescript.module";
        import { NgModule, NO_ERRORS_SCHEMA } from "@angular/core";
        import { NativeScriptAnimationsModule } from "nativescript-angular/animations";

        @NgModule({
          imports: [
            NativeScriptModule,
            NativeScriptAnimationsModule,
          ],
          schemas: [NO_ERRORS_SCHEMA]
        })
        export class ${featureModuleName} { }
      `);

      tree = schematicRunner.runSchematic('refactor-nsng-modules', defaultOptions, appTree);
      featureModuleContent = getFileContent(tree, featureModulePath);
    });

    it('should remove the NativeScriptAnimationsModule import', () => {
      expect(featureModuleContent).not.toMatch(`NativeScriptAnimationsModule`);
      expect(featureModuleContent)
        .not.toMatch('import { NativeScriptAnimationsModule } from "nativescript-angular/animations";'
      );
    });

    it('should add the animations module to the root module', () => {
      const newRootModuleContent = getFileContent(tree, rootModulePath);
      expect(newRootModuleContent).toMatch(`NativeScriptAnimationsModule`);
      expect(newRootModuleContent)
        .toMatch('import { NativeScriptAnimationsModule } from "nativescript-angular/animations";'
      );
    });

    it('should add the animations module to the root module', () => {
      const newRootModuleContent = getFileContent(tree, rootModulePath);
      expect(newRootModuleContent).toMatch(`NativeScriptAnimationsModule`);
      expect(newRootModuleContent)
        .toMatch('import { NativeScriptAnimationsModule } from "nativescript-angular/animations";'
      );
    });

    it('should remove the NativeScriptModule import', () => {
      expect(featureModuleContent).not.toMatch(`NativeScriptModule`);
      expect(featureModuleContent)
        .not.toMatch('import { NativeScriptModule } from "nativescript-angular/nativescript.module";'
      );
    });

    it('should import the NativeScriptCommonModule to the feature module', () => {
      expect(featureModuleContent).toMatch('import { NativeScriptCommonModule } from "nativescript-angular/common"');
    });

    it('should add the NativeScriptCommonModule to the module metadata', () => {
      expect(featureModuleContent).toMatch('NativeScriptCommonModule');
    });

  });
});
