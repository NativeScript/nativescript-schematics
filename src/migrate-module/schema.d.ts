export interface Schema {
  /**
  * Specifies the name of the module to be migrated.
  */
  name: string;
  /**
  * Specifies the module path.
  */
  modulePath?: string;
  /**
  * Specifies whether stylesheets should be generated for all components.
  */
  style: boolean;
  nsext?: string;
  /**
  * Allows specification of the project to be updated
  * The default option is the smart default 'projectName' provided by the Angular CLI.
  */
  project: string
}
