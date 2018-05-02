# NativeScript Schematics

This repository contains schematics for generating components in NativeScript Angular apps using the Angular CLI.

## Installation

### Install Angular CLI
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

```bash
ng new --collection=@nativescript/schematics my-mobile-app
```

You can specify the following options when generating new applications:

| Option | Description
| --- | ---
| routing | Generates a routing module and master-detail navigation.
| prefix | The prefix to apply to generated selectors.
| theme | Specifies whether the {N} css theme should be included.
| style | Specifies whether the app should use 'css' or 'scss' files for styling.
| minimal | Generates a minimal app (empty template, no theme).

### Prerequisites for using in existing project
You need to add an `.angular-cli.json` configuration file to your NativeScript project root directory. That will allow you to use Angular CLI for generating components.
```json
{
    "apps": [
        {
            "root": ".",
            "prefix": "your-app-prefix"
        }
    ],
    "defaults": {
        "styleExt": "css",
        "schematics": {
            "collection": "@nativescript/schematics"
        }
    }
}
```

> **Note:** If you created your project with `ng new`, your project already has `.angular-cli.json`.

### Generating Components, Modules, Directives, etc.
You can use the `ng generate` (or just `ng g`) command to generate pretty much any Angular building unit - components, modules, directives, classes and so on. For the full list, check out the Angular CLI [repo](https://github.com/angular/angular-cli#generating-components-directives-pipes-and-services).
Some of these generators are overwritten in NativeScript Schematics to suite the needs of a NativeScript Angular application. 

### Migrating ng Project to a shared project

### Migrating Web Components to a Shared Components
You can use `ng generate migrate-component` to convert a web Component to a shared component.
This includes the following steps:

 * add `component-name`.component.tns.html
 * add the component to its `.tns` parent module - note that the `module-name`.module.tns.ts need to exist before you execute the command, or just use the `--skipModule` flag
 * add `moduleId: module.id` to the `@Component` metadata

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