# Pull Request (PR) jobs

## Travis (external)
1. Builds the package.
2. Executes the unit tests in the repository.

## Jenkins (internal)
1. Builds the package.
2. Creates new shared (web+mobile) application.
3. Builds and deploys the application for Android and iOS.
4. Executes smoke tests verifying that application works.

> **Important!** Only PRs from maintainers trigger the Jenkins job. To start the Jenkins job for external PR, someone in the NativeScript organization must comment with `test` in the PR. The `test` comment can be used also to rerun all jobs.

# Jobs on commit in the `master` branch

## Travis (external)
1. Builds the package.
2. Executes the unit tests in the repository.

## Jenkins (internal)
1. Builds the package.
2. Publishes version with `next` tag in npm.
3. Executes the internal integration tests.

