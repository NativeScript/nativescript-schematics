import { join } from 'path';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { HostTree } from '@angular-devkit/schematics';

import { Schema as MasterDetailOptions } from './schema';
import { createEmptyNsOnlyProject, createEmptySharedProject } from '../../utils';

describe('Master-detail schematic', () => {
  const master = 'heroes';
  const detail = 'hero';
  const defaultOptions: MasterDetailOptions = {
    master,
    detail,
  };

  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    join(__dirname, '../../collection.json'),
  );

  let appTree: UnitTestTree;
  describe('When in {N}-only project', () => {
    beforeEach(() => {
      appTree = new UnitTestTree(new HostTree);
      appTree = createEmptyNsOnlyProject('some-project');
      appTree = schematicRunner.runSchematic('master-detail', { ...defaultOptions }, appTree);
    });

    it('should create all necessary files', () => {
      const { files } = appTree;

      expect(files.includes(`/app/${master}/${master}.module.ts`)).toBeTruthy();
      expect(files.includes(`/app/${master}/data.service.ts`)).toBeTruthy();
      expect(files.includes(`/app/${master}/${detail}-detail/${detail}-detail.component.ts`)).toBeTruthy();
      expect(files.includes(`/app/${master}/${detail}-detail/${detail}-detail.component.html`)).toBeTruthy();
      expect(files.includes(`/app/${master}/${master}/${master}.component.ts`)).toBeTruthy();
      expect(files.includes(`/app/${master}/${master}/${master}.component.html`)).toBeTruthy();
    });

  });

  describe('When in web+{N} project', () => {
    beforeEach(() => {
      appTree = new UnitTestTree(new HostTree);
      appTree = createEmptySharedProject('some-project');
      appTree = schematicRunner.runSchematic('master-detail', { ...defaultOptions }, appTree);
    });

    it('should create all necessary files', () => {
      const { files } = appTree;

      expect(files.includes(`/src/app/${master}/${master}.module.tns.ts`)).toBeTruthy();
      expect(files.includes(`/src/app/${master}/${master}.module.ts`)).toBeTruthy();
      expect(files.includes(`/src/app/${master}/${master}.common.ts`)).toBeTruthy();
      expect(files.includes(`/src/app/${master}/data.service.ts`)).toBeTruthy();

      expect(files.includes(`/src/app/${master}/${detail}-detail/${detail}-detail.component.ts`)).toBeTruthy();
      expect(files.includes(`/src/app/${master}/${detail}-detail/${detail}-detail.component.html`)).toBeTruthy();
      expect(files.includes(`/src/app/${master}/${detail}-detail/${detail}-detail.component.tns.html`)).toBeTruthy();

      expect(files.includes(`/src/app/${master}/${master}/${master}.component.ts`)).toBeTruthy();
      expect(files.includes(`/src/app/${master}/${master}/${master}.component.html`)).toBeTruthy();
      expect(files.includes(`/src/app/${master}/${master}/${master}.component.tns.html`)).toBeTruthy();
    });


  });

});
