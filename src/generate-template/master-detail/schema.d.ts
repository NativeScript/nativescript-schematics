export interface Schema {
  /**
   * The name of the master component.
   */
  master: string;
  
  /**
   * The name of the detail component.
   */
  detail: string;

  /**
   * The name of the project.
   * The default option is the smart default 'projectName' provided by the Angular CLI.
   */
  project: string;
}
