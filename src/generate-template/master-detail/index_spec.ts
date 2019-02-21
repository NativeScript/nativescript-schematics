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

      expect(files).toContain(`/app/${master}/${master}.module.ts`);
      expect(files).toContain(`/app/${master}/data.service.ts`);
      expect(files).toContain(`/app/${master}/${detail}-detail/${detail}-detail.component.ts`);
      expect(files).toContain(`/app/${master}/${detail}-detail/${detail}-detail.component.html`);
      expect(files).toContain(`/app/${master}/${master}/${master}.component.ts`);
      expect(files).toContain(`/app/${master}/${master}/${master}.component.html`);
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

      expect(files).toContain(`/src/app/${master}/${master}.module.tns.ts`);
      expect(files).toContain(`/src/app/${master}/${master}.module.ts`);
      expect(files).toContain(`/src/app/${master}/${master}.common.ts`);
      expect(files).toContain(`/src/app/${master}/data.service.ts`);

      expect(files).toContain(`/src/app/${master}/${detail}-detail/${detail}-detail.component.ts`);
      expect(files).toContain(`/src/app/${master}/${detail}-detail/${detail}-detail.component.html`);
      expect(files).toContain(`/src/app/${master}/${detail}-detail/${detail}-detail.component.tns.html`);

      expect(files).toContain(`/src/app/${master}/${master}/${master}.component.ts`);
      expect(files).toContain(`/src/app/${master}/${master}/${master}.component.html`);
      expect(files).toContain(`/src/app/${master}/${master}/${master}.component.tns.html`);
    });


  });

});
