export interface Schema {
  /**
   * The name of the project.
   * The default option is the smart default 'projectName' provided by the Angular CLI.
   */
  project: string;
  /**
   * The path to the source directory.
   */
  srcPath: string;
  /**
   * Array with paths to the files that shouldn't be modified by the schematic.
   */
  filesToIgnore?: Array<string>;
}
