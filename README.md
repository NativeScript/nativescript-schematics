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
| -- | -- |
| routing | Generates a routing module.
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

