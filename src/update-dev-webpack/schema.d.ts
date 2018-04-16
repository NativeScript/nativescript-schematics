export interface Schema {
  /**
   * The path of the source directory. i.e app or src
   */
  sourceDir: string;
  /**
   * Extension used for NativeScript files. Default: .tns
   */
  nsext: string;
  /**
   * The name of the main file. Defualt: main
   */
  main: string;
  /**
   * Path to the entry module. i.e. app/app.module or src/app/app.module
   */
  entryModulePath: string;
  /**
   * The name of the entry Module class. Default AppModule
   */
  entryModuleName: string;
}
