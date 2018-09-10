import { resolve } from 'path';

import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { Schema as AddNsOptions } from './schema';
import { getFileContent } from '@schematics/angular/utility/test';

describe('Add {N} schematic', () => {
    const schematicRunner = new SchematicTestRunner(
        'nativescript-schematics',
        resolve(__dirname, '../collection.json'),
    );
    const project = 'foo';
    const defaultOptions: AddNsOptions = {
        project,
        nsExtension: 'tns',
        webExtension: '',
        sample: false,
    };

    let appTree: UnitTestTree;

    beforeEach(() => {
        appTree = new UnitTestTree(new HostTree);
        appTree = setupProject(appTree, schematicRunner, project);
    });

    describe('when using the default options', () => {
        beforeEach(() => {
            appTree = schematicRunner.runSchematic('add-ns', defaultOptions, appTree);
        });

        it('should add dependency to NativeScript schematics', () => {
            const configFile = '/angular.json';
            expect(appTree.files.includes(configFile)).toBeTruthy();
            const configFileContent = JSON.parse(getFileContent(appTree, configFile));

            expect(configFileContent.cli.defaultCollection).toEqual('@nativescript/schematics');
        });

        it('should add {N} specific files', () => {
            const files = appTree.files;

            expect(files.includes('/nsconfig.json')).toBeTruthy();
            expect(files.includes('/tsconfig.tns.json')).toBeTruthy();
            expect(files.includes('/foo/src/app.css')).toBeTruthy();
            expect(files.includes('/foo/src/main.ns.ts')).toBeTruthy();
            expect(files.includes('/foo/src/package.json')).toBeTruthy();
            expect(files.includes('/foo/src/app/app.module.tns.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/app.component.tns.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/app.component.tns.html')).toBeTruthy();
        });

        it('should add native app resources', () => {
            expect(appTree.files.includes('/App_Resources/Android/app.gradle')).toBeTruthy();
            expect(appTree.files.includes('/App_Resources/iOS/Info.plist')).toBeTruthy();
        });

        it('should add {N} specifics to gitignore', () => {
            const gitignorePath = '/.gitignore';
            expect(appTree.files.includes(gitignorePath)).toBeTruthy();
            const gitignore = getFileContent(appTree, gitignorePath);

            expect(gitignore.includes('node_modules/')).toBeTruthy();
            expect(gitignore.includes('platforms/')).toBeTruthy();
            expect(gitignore.includes('hooks/')).toBeTruthy();
            expect(gitignore.includes('foo/src/**/*.js')).toBeTruthy();
        });

        it('should add all required dependencies to the package.json', () => {
            const packageJsonPath = '/package.json';
            expect(appTree.files.includes(packageJsonPath)).toBeTruthy();

            const packageJson = JSON.parse(getFileContent(appTree, packageJsonPath));
            const { dependencies, devDependencies } = packageJson;
            expect(dependencies).toBeDefined();
            expect(dependencies['nativescript-angular']).toBeDefined();
            expect(dependencies['nativescript-theme-core']).toBeDefined();
            expect(dependencies['tns-core-modules']).toBeDefined();
            expect(dependencies['reflect-metadata']).toBeDefined();
            
            expect(devDependencies['nativescript-dev-webpack']).toBeDefined();
            expect(devDependencies['@nativescript/schematics']).toBeDefined();
        });

        it('should add run scripts to the package json', () => {
            const packageJsonPath = '/package.json';
            expect(appTree.files.includes(packageJsonPath)).toBeTruthy();

            const packageJson = JSON.parse(getFileContent(appTree, packageJsonPath));
            const { scripts } = packageJson;
            expect(scripts).toBeDefined();
            expect(scripts['android']).toEqual('tns run android --bundle');
            expect(scripts['ios']).toEqual('tns run ios --bundle');
        });

        it('should add NativeScript key to the package json', () => {
            const packageJsonPath = '/package.json';
            expect(appTree.files.includes(packageJsonPath)).toBeTruthy();

            const packageJson = JSON.parse(getFileContent(appTree, packageJsonPath));
            const { nativescript } = packageJson;

            expect(nativescript).toBeDefined();
            expect(nativescript['id']).toEqual('org.nativescript.ngsample');
        });

        it('should exclude {N} files from the web TS compilation', () => {
            const webTsconfigPath = '/foo/tsconfig.app.json';
            expect(appTree.files.includes(webTsconfigPath)).toBeTruthy();

            const webTsconfig = JSON.parse(getFileContent(appTree, webTsconfigPath));
            const { exclude } = webTsconfig;

            expect(exclude).toBeDefined();
            expect(exclude.includes('**/*.tns.ts')).toBeTruthy();
            expect(exclude.includes('**/*.android.ts')).toBeTruthy();
            expect(exclude.includes('**/*.ios.ts')).toBeTruthy();
        });

        it('should generate a sample shared component', () => {
            const { files } = appTree;
            expect(files).toContain('/foo/src/app/auto-generated/auto-generated.component.ts');
            expect(files).toContain('/foo/src/app/auto-generated/auto-generated.component.html');
            expect(files).toContain('/foo/src/app/auto-generated/auto-generated.component.tns.html');
        });
    });

    describe('when the sample flag is raised', () => {
        beforeEach(() => {
            const options = {
                ...defaultOptions,
                sample: true,
            };

            appTree = schematicRunner.runSchematic('add-ns', options, appTree);
        });

        it('should generate sample files', () => {
            const { files } = appTree;

            expect(files.includes('/foo/src/app/barcelona/barcelona.common.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/barcelona.module.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/barcelona.module.tns.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/player.service.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/player.ts')).toBeTruthy();

            expect(files.includes('/foo/src/app/barcelona/players/players.component.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/players/players.component.html')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/players/players.component.tns.html')).toBeTruthy();

            expect(files.includes('/foo/src/app/barcelona/player-detail/player-detail.component.ts')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/player-detail/player-detail.component.html')).toBeTruthy();
            expect(files.includes('/foo/src/app/barcelona/player-detail/player-detail.component.tns.html')).toBeTruthy();
        });
    });
});

function setupProject(
    tree: UnitTestTree,
    schematicRunner: SchematicTestRunner,
    name: string,
) {

    tree = schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'workspace',
        {
            name: 'workspace',
            version: '6.0.0',
            newProjectRoot: ''
        }
    );

    tree = schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        { name },
        tree
    );

    return tree;
}
