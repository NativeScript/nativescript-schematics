<a name="0.2.5"></a>
## [0.2.5](https://github.com/nativescript/nativescript-schematics/compare/0.2.4...0.2.5) (2018-08-11)


### Features

* **migrate-component:** copy the web template into the migrated component ([#65](https://github.com/nativescript/nativescript-schematics/issues/65)) ([ad08b25](https://github.com/nativescript/nativescript-schematics/commit/ad08b25))


<a name="0.2.4"></a>
## [0.2.4](https://github.com/nativescript/nativescript-schematics/compare/0.2.3...0.2.4) (2018-08-02)


### Bug Fixes

* **add-ns:** exclude {N} files from web tsconfig ([9792a54](https://github.com/nativescript/nativescript-schematics/commit/9792a54)), closes [#56](https://github.com/nativescript/nativescript-schematics/issues/56)


### Features

* introduce --sample flag for `ng add` ([3c05fe4b556adde214dc880d4957c970e700eeed](https://github.com/NativeScript/nativescript-schematics/commit/3c05fe4b556adde214dc880d4957c970e700eeed))



<a name="0.2.3"></a>
## [0.2.3](https://github.com/nativescript/nativescript-schematics/compare/0.2.2...0.2.3) (2018-07-31)


### Bug Fixes

* ignore spec files when building for mobile ([08ede96](https://github.com/nativescript/nativescript-schematics/commit/08ede96))
* **application:** respect the provided style extension ([0249f06](https://github.com/nativescript/nativescript-schematics/commit/0249f06))


### Features

* add webpack flag to the application schematics ([258ddb1](https://github.com/nativescript/nativescript-schematics/commit/258ddb1))
* have routing by default for new applications ([cc320ed](https://github.com/nativescript/nativescript-schematics/commit/cc320ed))
* introduce --sample flag for `ng new --shared` ([528701b](https://github.com/nativescript/nativescript-schematics/commit/528701b))



<a name="0.2.2"></a>
## [0.2.2](https://github.com/nativescript/nativescript-schematics/compare/0.2.1...0.2.2) (2018-07-26)


### Bug Fixes

* Target official Angular 6.1 versions


<a name="0.2.1"></a>
## [0.2.1](https://github.com/nativescript/nativescript-schematics/compare/0.2.0...0.2.1) (2018-07-25)


### Bug Fixes

* wrong noop import ([2e956bf](https://github.com/nativescript/nativescript-schematics/commit/2e956bf))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/nativescript/nativescript-schematics/compare/0.1.7...0.2.0) (2018-07-25)


### Bug Fixes

* module.id issue in code sharing projects ([#43](https://github.com/nativescript/nativescript-schematics/issues/43)) ([9325ff3](https://github.com/nativescript/nativescript-schematics/commit/9325ff3)), closes [#40](https://github.com/nativescript/nativescript-schematics/issues/40)
* skip move path is '' ([c06187d](https://github.com/nativescript/nativescript-schematics/commit/c06187d))
* skip rename when web extension not provided ([3eede03](https://github.com/nativescript/nativescript-schematics/commit/3eede03))



<a name="0.1.7"></a>
## [0.1.7](https://github.com/nativescript/nativescript-schematics/compare/0.1.5...0.1.7) (2018-07-19)


### Bug Fixes

* module.id issue in code sharing projects ([#43](https://github.com/nativescript/nativescript-schematics/issues/43)) ([9325ff3](https://github.com/nativescript/nativescript-schematics/commit/9325ff3)), closes [#40](https://github.com/nativescript/nativescript-schematics/issues/40)



<a name="0.1.6"></a>
## [0.1.6](https://github.com/nativescript/nativescript-schematics/compare/0.1.5...0.1.6) (2018-07-19)


### Features

* **ng-new:** support --style=scss option 
* **ng-new:** support --no-theme flag 


<a name="0.1.5"></a>
## [0.1.5](https://github.com/nativescript/nativescript-schematics/compare/0.1.4...0.1.5) (2018-07-06)


### Bug Fixes

* **ng-new:** add nativescript-dev-sass to dependencies ([#32](https://github.com/nativescript/nativescript-schematics/issues/32)) ([1f3ec65](https://github.com/nativescript/nativescript-schematics/commit/1f3ec65)), closes [#30](https://github.com/nativescript/nativescript-schematics/issues/30)



<a name="0.1.4"></a>
## [0.1.4](https://github.com/nativescript/nativescript-schematics/compare/0.1.3...0.1.4) (2018-07-05)

### Bug Fixes

* Add NativeScriptFormsModule and NativeScriptHttpClientModule to app.module for {N}
* tsconfig issues


<a name="0.1.3"></a>
## [0.1.3](https://github.com/nativescript/nativescript-schematics/compare/0.1.1...0.1.3) (2018-06-11)


### Bug Fixes

* fix: target official {N} webpack version ([a7a36c3](https://github.com/nativescript/nativescript-schematics/commit/a7a36c3))


<a name="0.1.1"></a>
## [0.1.1](https://github.com/nativescript/nativescript-schematics/compare/0.0.9...0.1.1) (2018-06-11)


### Bug Fixes

* import utils/angular-project-parser from the right paths ([14ddd8a](https://github.com/nativescript/nativescript-schematics/commit/14ddd8a))
* remove __sourcedir__ folder in _ns_files ([26a3ef6](https://github.com/nativescript/nativescript-schematics/commit/26a3ef6))


### Features

* add migration schematic from {N} to web+{N} shared project ([#3](https://github.com/nativescript/nativescript-schematics/issues/3)) ([5e5161c](https://github.com/nativescript/nativescript-schematics/commit/5e5161c))
* add schematic for fixing module imports in feature modules ([180d27a](https://github.com/nativescript/nativescript-schematics/commit/180d27a))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/nativescript/nativescript-schematics/compare/0.0.9...0.1.0) (2018-05-30)


### Bug Fixes

* import utils/angular-project-parser from the right paths ([14ddd8a](https://github.com/nativescript/nativescript-schematics/commit/14ddd8a))
* remove __sourcedir__ folder in _ns_files ([26a3ef6](https://github.com/nativescript/nativescript-schematics/commit/26a3ef6))


### Features

* add support for Angular 6
* add migration schematic from {N} to web+{N} shared project ([#3](https://github.com/nativescript/nativescript-schematics/issues/3)) ([5e5161c](https://github.com/nativescript/nativescript-schematics/commit/5e5161c))
* add schematic for fixing module imports in feature modules ([180d27a](https://github.com/nativescript/nativescript-schematics/commit/180d27a))
* add migrate component schematic ([0fd34f97fda7994aa3ca8a6b8d9bb27b5b56d98e](https://github.com/nativescript/nativescript-schematics/commit/0fd34f97fda7994aa3ca8a6b8d9bb27b5b56d98e))



