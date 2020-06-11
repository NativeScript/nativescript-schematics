import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';

import { Schema as SharedOptions } from './schema';

describe('Shared Application Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    'nativescript-schematics',
    path.join(__dirname, '../../collection.json'),
  );
  const defaultOptions: SharedOptions = {
    name: 'foo',
    prefix: '',
    sourceDir: 'src',
    style: 'css',
    theme: true,
    sample: false,
  };

  it('should create all files of an application', async () => {
    const options = { ...defaultOptions };

    const tree = await schematicRunner.runSchematicAsync('shared', options).toPromise();
    const files = tree.files;
    expect(files).toContain('/foo/angular.json');
    expect(files).toContain('/foo/ngcc.config.js');
    expect(files).toContain('/foo/nsconfig.json');
    expect(files).toContain('/foo/.gitignore');
    expect(files).toContain('/foo/package.json');
    expect(files).toContain('/foo/tsconfig.tns.json');
    expect(files).toContain('/foo/tsconfig.spec.json');

    expect(files).toContain('/foo/src/package.json');
    expect(files).toContain('/foo/src/main.tns.ts');
    expect(files).toContain('/foo/src/app/app.module.ts');

    expect(files).toContain('/foo/src/app/app.component.ts');
    expect(files).toContain('/foo/src/app/app.component.html');
    expect(files).toContain('/foo/src/app/app.component.tns.html');

    expect(files).toContain('/foo/src/app/home/home.component.ts');
    expect(files).toContain('/foo/src/app/home/home.component.html');
    expect(files).toContain('/foo/src/app/home/home.component.css');
  });

  it('should create all sample files when the sample flag is provided', async () => {
    const options = { ...defaultOptions, sample: true };

    const tree = await schematicRunner.runSchematicAsync('shared', options).toPromise();
    const files = tree.files;
    expect(files).toContain('/foo/src/app/barcelona/barcelona.common.ts');
    expect(files).toContain('/foo/src/app/barcelona/barcelona.module.ts');
    expect(files).toContain('/foo/src/app/barcelona/barcelona.module.tns.ts');
    expect(files).toContain('/foo/src/app/barcelona/player.service.ts');
    expect(files).toContain('/foo/src/app/barcelona/player.model.ts');

    expect(files).toContain('/foo/src/app/barcelona/players/players.component.html');
    expect(files).toContain('/foo/src/app/barcelona/players/players.component.tns.html');
    expect(files).toContain('/foo/src/app/barcelona/players/players.component.ts');

    expect(files).toContain('/foo/src/app/barcelona/player-detail/player-detail.component.html');
    expect(files).toContain('/foo/src/app/barcelona/player-detail/player-detail.component.tns.html');
    expect(files).toContain('/foo/src/app/barcelona/player-detail/player-detail.component.ts');
  });

  it('should generate correct files when different style extension is specified', async () => {
    const options = { ...defaultOptions, style: 'scss' };
    const tree = await schematicRunner.runSchematicAsync('application', options).toPromise();

    const files = tree! .files;

    expect(files).not.toContain('/foo/src/app.css');
    expect(files).toContain('/foo/src/app.android.scss');
    expect(files).toContain('/foo/src/app.ios.scss');

    expect(files).not.toContain('/foo/src/home/home.component.css');
    expect(files).toContain('/foo/src/home/home.component.scss');
  });
});
