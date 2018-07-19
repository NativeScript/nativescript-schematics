# Contributing

:+1: First of all, thank you for taking the time to contribute! :+1:


## Code of Conduct
Help us keep a healthy and open community. We expect all participants in this project to adhere to the [NativeScript Code Of Conduct](https://github.com/NativeScript/codeofconduct).


## Setup

1. [Fork](https://help.github.com/articles/fork-a-repo/) and clone the GitHub repository:
    ```bash
    git clone https://github.com/your-username/nativescript-schematics.git
    ```

2. Add an 'upstream' remote pointing to the original repository:
    ```bash
    cd nativescript-schematics
    git remote add upstream https://github.com/NativeScript/nativescript-schematics.git
    ```

3. Create a branch for your changes:
    ```bash
    git checkout -b <my-fix-branch> master
    ```

4. Install dependencies:
    ```bash
    npm install
    ```

The last command also runs `npm prepare` which compiles the TypeScript files in the plugin. 
While developing, you can run the `npm run watch` command which will recompile on every change.
You are good to go! You're strongly encouraged to follow the official NativeScript [Coding Conventions](https://github.com/NativeScript/NativeScript/blob/master/CodingConvention.md).

## Reporting Bugs

1. Always update to the most recent master release; the bug may already be resolved.
2. Search for similar issues in the issues list for this repo; it may already be an identified problem.
3. If this is a bug or problem that is clear, simple, and is unlikely to require any discussion -- it is OK to open an issue on GitHub with a reproduction of the bug including workflows and screenshots. If possible, submit a Pull Request with a failing test, entire application or module. If you'd rather take matters into your own hands, fix the bug yourself (jump down to the [Submitting a PR](#submitting-pr) section).

## Requesting Features

1. Use Github Issues to submit feature requests.
2. First, search for a similar request and extend it if applicable. This way it would be easier for the community to track the features.
3. When requesting a new feature, please provide as much detail as possible about why you need the feature in your apps. We prefer that you explain a need rather than explain a technical solution for it. That might trigger a nice conversation on finding the best and broadest technical solution to a specific need.

## Submitting PR

1. Create one or several commits describing your changes. Follow the [Angular commit message guidelines](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit#heading=h.uyo6cb12dt6w).

2. Push your branch to GitHub:
    ```bash
    git push origin my-fix-branch
    ```

3. In GitHub, send a pull request to `nativescript-schematics:master`. If we suggest changes, then:

    *   Make the required updates.
    *   Commit the changes to your branch (e.g. `my-fix-branch`).
    *   Push the changes to your GitHub repository (this will update your PR).

4. If your branch gets outdated you may need to rebase it on top of the upstream master and force push to update your PR:

    1. Fetch the latest changes
        ```bash
        git fetch upstream
        ```

    2. Check out to your fork's local `master` branch
        ```bash
        git checkout master
        ```

    3. Merge the original repo changes into your local `master` branch
        ```bash
        git merge upstream/master
        ```

    4. Rebase it on top of `master`
        ```bash
        git rebase -i master
        ```

    5. Update your PR with force push
        ```bash
        git push -f origin my-fix-branch
        ```

Thank you for your contribution!

## Publishing new versions

1. Run `npm install` to install the dependencies and prepare the package for publishing.
```bash
npm install
```

2. Add the following to your `.npmrc`.
```
tag-version-prefix=""
message="release: cut the %s release"
```

3. Create new branch for the release:
```
git checkout -b username/release-version
```

4. Run `npm version` to bump the version in the `package.json`, tag the release and update the CHANGELOG.md:
```
npm version [patch|minor|major]
```

5. Push all changes to your branch and create a PR.
```bash
git push --set-upstream origin username/release-version --tags
```

6. Publish the package to npm after the PR is merged.
```bash
npm publish
```

