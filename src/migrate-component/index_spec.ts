import { join } from 'path';

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { HostTree } from '@angular-devkit/schematics';
import { getFileContent } from '@schematics/angular/utility/test';

import { isInModuleMetadata } from '../test-utils';
import { Schema as ApplicationOptions } from '../ng-new/shared/schema';
import { Schema as ModuleOptions } from '../generate/module/schema';
import { Schema as ComponentOptions } from '../generate/component/schema';
import { moveToRoot } from '../utils';
import { Schema as MigrateComponentOptions } from './schema';

describe('Migrate component schematic', () => {
    const project = 'some-project';
    const schematicRunner = new SchematicTestRunner(
        'nativescript-schematics',
        join(__dirname, '../collection.json')
    );

    let appTree: UnitTestTree;
    beforeEach(() => {
        appTree = new UnitTestTree(new HostTree());
        appTree = setupProject(appTree, schematicRunner, project);
     });

    describe('When the name of existing component is provided', () => {
        const componentName = 'a';
        const options: MigrateComponentOptions = {
            project,
            name: componentName,
        };
        const htmlComponentPath = `/src/app/${componentName}/${componentName}.component.html`;
        const xmlComponentPath = `/src/app/${componentName}/${componentName}.component.tns.html`;

        beforeEach(() => {
            appTree = schematicRunner.runSchematic('component', <ComponentOptions>{
                name: componentName,
                nativescript: false,
                web: true,
                project,
            }, appTree);
            appTree = schematicRunner.runSchematic('migrate-component', options, appTree);
        });

        it('should create an {N} markup file for the component', () => {
            expect(appTree.files.includes(xmlComponentPath)).toBeTruthy();
        });

        it('should declare the component in the correct NgModule', () => {
            const nsModulePath = `/src/app/app.module.tns.ts`;
            const content = getFileContent(appTree, nsModulePath);

            const matcher = isInModuleMetadata('AppModule', 'declarations', 'AComponent', true);
            expect(content).toMatch(matcher);
        });

        it('should put the original web template in the {N} markup file', () => {
            const html = getFileContent(appTree, htmlComponentPath);
            const xml = getFileContent(appTree, xmlComponentPath);

            expect(xml.includes(html)).toBeTruthy();
        });
    });

    describe('When component imported in another module is provided', () => {
        const componentName = 'a';
        const moduleName = 'b';
        const options : MigrateComponentOptions= {
            project,
            name: componentName,
            module: moduleName,
        };
        const htmlComponentPath = `/src/app/${componentName}/${componentName}.component.html`;
        const xmlComponentPath = `/src/app/${componentName}/${componentName}.component.tns.html`;

        beforeEach(() => {
            appTree = schematicRunner.runSchematic('module', <ModuleOptions>{
                project,
                name: moduleName,
            }, appTree);

            appTree = schematicRunner.runSchematic('component', <ComponentOptions>{
                project,
                nativescript: false,
                web: true,
                name: componentName,
                module: moduleName,
            }, appTree);

            appTree = schematicRunner.runSchematic('migrate-component', { ...options }, appTree);

        });

        it('should create an {N} markup file for the component', () => {
            expect(appTree.files.includes(xmlComponentPath)).toBeTruthy();
        });

        it('should declare the component in the correct NgModule', () => {
            const nsModulePath = `/src/app/${moduleName}/${moduleName}.module.tns.ts`;
            const content = getFileContent(appTree, nsModulePath);

            const matcher = isInModuleMetadata("BModule", 'declarations', 'AComponent', true);
            expect(content).toMatch(matcher);
        });

        it('should put the original web template in the {N} markup file', () => {
            const html = getFileContent(appTree, htmlComponentPath);
            const xml = getFileContent(appTree, xmlComponentPath);

            expect(xml.includes(html)).toBeTruthy();
        });
    });
});

const setupProject = (
    appTree: UnitTestTree,
    schematicRunner: SchematicTestRunner,
    project: string,
) => {
    appTree = schematicRunner.runSchematic('shared', <ApplicationOptions>{
        name: project,
        prefix: '',
        sourceDir: 'src',
        style: 'css',
        theme: true,
        sample: false,
    }, appTree);

    appTree = moveToRoot<UnitTestTree>(schematicRunner, appTree, project);

    return appTree;
};
