import { join } from 'path';

import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

import { createEmptyNsOnlyProject, createEmptySharedProject } from '../test-utils';
import { Schema as ComponentOptions } from './component/schema';
import { Schema as ModuleOptions } from './module/schema';
import { getPlatformUse } from './utils';

const project = 'leproj';

describe('Validation should trigger', () => {
    const defaultComponentOptions: ComponentOptions = { name: 'fooComponent', project };
    const defaultModuleOptions: ModuleOptions = { name: 'fooModule', project };

    const schematicRunner = new SchematicTestRunner(
        '@nativescript/schematics',
        join(__dirname, '../collection.json'),
    );

    describe('for component schematic, when', () => {
        it('both ns and web are disabled in ns-only project', async () => {
            const tree = createEmptyNsOnlyProject(project);
            const options = { ...defaultComponentOptions, nativescript: false, web: false };

            const promise = schematicRunner.runSchematicAsync('component', options, tree)
                .toPromise();
            const error = 'You shouldn\'t disable both --web and --nativescript flags';

            await expectAsync(promise).toBeRejectedWithError(error);
        });

        it('both ns and web are disabled in ns+web project', async () => {
            const tree = createEmptySharedProject(project);
            const options = { ...defaultComponentOptions, nativescript: false, web: false };

            const promise = schematicRunner.runSchematicAsync('component', options, tree)
                .toPromise();
            const error = 'You shouldn\'t disable both --web and --nativescript flags';

            await expectAsync(promise).toBeRejectedWithError(error);
        });

        it('using inline templates in ns+web project', async () => {
            const tree = createEmptySharedProject(project);
            const options: ComponentOptions = { ...defaultComponentOptions, inlineTemplate: true };

            const promise = schematicRunner.runSchematicAsync('component', options, tree)
                .toPromise();
            const error = /--inlineTemplate/;

            await expectAsync(promise).toBeRejectedWithError(error);
        });

        it('using web-only schematic in ns-only project', async () => {
            const tree = createEmptyNsOnlyProject(project);
            const options = { ...defaultComponentOptions, web: true, nativescript: false };

            const promise = schematicRunner.runSchematicAsync('component', options, tree)
                .toPromise();
            const error = 'Project is not configured for Angular Web, while --nativescript is set to false';

            await expectAsync(promise).toBeRejectedWithError(error);
        });
    });

    describe('for module schematic, when', () => {
        it('both ns and web are disabled in ns-only project', async () => {
            const tree = createEmptyNsOnlyProject(project);
            const options = { ...defaultModuleOptions, nativescript: false, web: false };

            const promise = schematicRunner.runSchematicAsync('module', options, tree).toPromise();
            const error = 'You shouldn\'t disable both --web and --nativescript flags';

            await expectAsync(promise).toBeRejectedWithError(error);
        });

        it('both ns and web are disabled in ns+web project', async () => {
            const tree = createEmptySharedProject(project);
            const options = { ...defaultModuleOptions, nativescript: false, web: false };

            const promise = schematicRunner.runSchematicAsync('module', options, tree).toPromise();
            const error = 'You shouldn\'t disable both --web and --nativescript flags';

            await expectAsync(promise).toBeRejectedWithError(error);
        });

        it('using web-only schematic in ns-only project', async () => {
            const tree = createEmptyNsOnlyProject(project);
            const options = { ...defaultModuleOptions, web: true, nativescript: false };

            const promise = schematicRunner.runSchematicAsync('module', options, tree).toPromise();
            const error = 'Project is not configured for Angular Web, while --nativescript is set to false';

            await expectAsync(promise).toBeRejectedWithError(error);
        });
    });
});

describe('getPlatformUse', () => {
    const nsOnlyProj = createEmptyNsOnlyProject(project);
    const sharedProj = createEmptySharedProject(project);
    const baseOpts = { name: 'foo', project: 'bar' };

    describe('for ns-only project', () => {
        it('should report ready only for NS', () => {
            const res = getPlatformUse(nsOnlyProj, { ...baseOpts });
            expect(res.webReady).toBeFalsy();
            expect(res.nsReady).toBeTruthy();
            expect(res.nsOnly).toBeTruthy();
        });

        it('should report correctly when ns:true web:true', () => {
            const res = getPlatformUse(nsOnlyProj, { ...baseOpts, nativescript: true, web: true });
            expect(res.useNs).toBeTruthy();
            expect(res.useWeb).toBeFalsy();
        });

        it('should report correctly when ns:true web:false', () => {
            const res = getPlatformUse(nsOnlyProj, { ...baseOpts, nativescript: true, web: false });
            expect(res.useNs).toBeTruthy();
            expect(res.useWeb).toBeFalsy();
        });

        it('should report correctly when ns:false web:true', () => {
            const res = getPlatformUse(nsOnlyProj, { ...baseOpts, nativescript: false, web: true });
            expect(res.useNs).toBeFalsy();
            expect(res.useWeb).toBeFalsy();
        });
    });

    describe('for ns+web project', () => {
        it('should report ready for both Web and NS', () => {
            const res = getPlatformUse(sharedProj, { ...baseOpts });
            expect(res.webReady).toBeTruthy();
            expect(res.nsReady).toBeTruthy();
            expect(res.nsOnly).toBeFalsy();
        });

        it('should report correctly when ns:true web:true', () => {
            const res = getPlatformUse(sharedProj, { ...baseOpts, nativescript: true, web: true });
            expect(res.useNs).toBeTruthy();
            expect(res.useWeb).toBeTruthy();
        });

        it('should report correctly when ns:true web:false', () => {
            const res = getPlatformUse(sharedProj, { ...baseOpts, nativescript: true, web: false });
            expect(res.useNs).toBeTruthy();
            expect(res.useWeb).toBeFalsy();
        });

        it('should report correctly when ns:false web:true', () => {
            const res = getPlatformUse(sharedProj, { ...baseOpts, nativescript: false, web: true });
            expect(res.useNs).toBeFalsy();
            expect(res.useWeb).toBeTruthy();
        });
    });
});
