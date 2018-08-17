# NativeScript Schematics  [![Build Status](https://travis-ci.org/NativeScript/nativescript-schematics.svg?branch=master)](https://travis-ci.org/NativeScript/nativescript-schematics)

This repository contains schematics for generating components in NativeScript Angular apps using the Angular CLI.

## Installation

### Install Angular CLI

You should be using `@angular/cli@6.1.0` or newer.

```bash
npm i -g @angular/cli
```

### Install NativeScript Schematics
```bash
npm i -g @nativescript/schematics
```

## Usage

### Creating a new project
To generate new NativeScript Angular project, you can use `ng new` with `@nativescript/schematics` specified as the schematics collection.

#### NativeScript Only

```bash
ng new --collection=@nativescript/schematics my-mobile-app
```

You can specify the following options when generating new applications:

| Option | Description | Default
| --- | --- | ---
| prefix | The prefix to apply to generated selectors. | `app`
| theme | Specifies whether the {N} css theme should be included. | `true`
| style | Specifies whether the app should use 'css' or 'scss' files for styling. | `css`
| webpack | Specifies whether the app will be ready for building with webpack. | `true`

#### Web + Mobile Code Sharing project

```bash
ng new --collection=@nativescript/schematics my-shared-app --shared
```

You can specify the following options when generating new applications:

| Option | Description | Default
| --- | --- | ---
| sourceDir | The name of the source directory. | `src`
| prefix | The prefix to apply to generated selectors. | `app`
| theme | Specifies whether the {N} css theme should be included. | `true`
| style | Specifies whether the app should use 'css' or 'scss' files for styling. | `css`
| sample | Generates an eagerly loaded module and master-detail navigation. | `false`

### Prerequisites for using `@nativescript/schematics` in an existing project
You need to add an `angular.json` configuration file to your NativeScript project root directory. That will allow you to use Angular CLI for generating components.
```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "cli": {
    "defaultCollection": "@nativescript/schematics"
  },
  "projects": {
    "project-name": {
      "root": "",
      "sourceRoot": ".",
      "projectType": "application",
      "prefix": "app"
    }
  },
  "defaultProject": "project-name"
}
```

> **Note:** If you created your project with `ng new`, your project already has `angular.json`.

#### Generate angular.json

You can generate it the configuration using `Schematics`. Install `Schematics globally`

```bash
npm install -g @angular-devkit/schematics-cli
```

From inside your project call:

```bash
schematics @nativescript/schematics:angular-json --name=project-name
```

### Generating Components, Modules, Directives, etc.
You can use the `ng generate` (or just `ng g`) command to generate pretty much any Angular building unit - components, modules, directives, classes and so on. For the full list, check out the Angular CLI [repo](https://github.com/angular/angular-cli#generating-components-directives-pipes-and-services).
Some of these generators are overwritten in NativeScript Schematics to suite the needs of a NativeScript Angular application. 

To generate a component, call:
```bash
ng g c component-name
```

To generate a module, call:
```bash
ng g m module-name
```

To generate a component in an existing module folder, call:
```bash
ng g c module-name/component-name
```

### Migrating ng Project to a shared project

### Migrating Web Components to a Shared Components
You can use `ng generate migrate-component` to convert a web Component to a shared component.
This includes the following steps:

 * add `component-name`.component.tns.html
 * add the component to its `.tns` parent module - note that the `module-name`.module.tns.ts need to exist before you execute the command, or just use the `--skipModule` flag

Params:

 * name - `required` - name of the component to be migrated - do not include the word `Component`
 * componentPath - `optional` - the location of the component file, do not include `src/app`, i.e. `home/home.component.ts` - use if the componentPath cannot be derived from the parent module
 * module - `optional` - the name of the parent module - do not include the word `Module`, leave empty if using the default EntryModule (`AppModule`)
 * modulePath - `optional` - the location of the parent module file, do not include `src/app`, i.e. `home/home.module.ts` - use if the module is not located at the `root/app` (by default: `src/app`)
 * skipModule - `optional` - use if you don't want the module to be used for finding the component, and if you don't want to add the Component to Modules providers

### Migrating Web Modules to Shared Modules
You can use `ng generate migrate-module` to convert a Web Module to a Shared Module and also convert all of its Components.
This includes the following steps:

 * add `module-name`.component.tns.ts
 * convert all of modules' components, by using `migrate-component` schematic
 * copy over all providers from the web module


## Code sharing: Build

In a code sharing project to build:

 * a `web` app call: `ng serve`,
 * an `iOS` app call: `tns run ios --bundle`,
 * an `Android` app call: `tns run android --bundle`

## Templates

### Master Detail template

To generate a Master Detail module, you can use the following command
`ng g master-detail --master=dogs --detail=dog`

The above command will generate the following file structure

 * dogs
  * dog-detail
    * dog-detail component files
  * dogs
    * dogs component files
  * data.service.ts
  * dogs.module.ts

#### Options

| Option | Description 
| --- | --- 
| master | The name of the master component and the name of the module.
| detail | The name of the detail component
