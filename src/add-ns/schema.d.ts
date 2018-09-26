export interface Schema {
  /**
   * Allows specification of the used extension for {N}
   */
  nsExtension: string;
  /**
   * Allows specification of the used extension for web
   */
  webExtension: string;
  /**
   * The name of the project to be converted to a code sharing structure
  * The default option is the smart default 'projectName' provided by the Angular CLI.
   */
  project: string;
  /**
   * Specifies whether a sample master detail should be generated.
   */
  sample: boolean; 
  /**
   * Skip installing dependency packages.
   */
  skipInstall?: boolean;
}
