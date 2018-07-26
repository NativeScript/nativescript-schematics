# Adding Angular CLI to a NativeScript project.

1. Add `angular.json` to the project root, with the following content

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "cli": {
    "defaultCollection": "@nativescript/schematics"
  },
  "projects": {
    "my-project-name": {
      "root": "",
      "sourceRoot": ".",
       "projectType": "application",
       "prefix": "app"
    }
  },
  "defaultProject": "my-project-name"
}
```

You can update `my-project-name` to the actual name of your project, but that is not absolutely necessary.

2. Install Angular CLI

```bash
npm i --save-dev @angular/cli
```

3. Install NativeScript Schematics

```bash
npm i --save-dev @nativescript/schematics
```
