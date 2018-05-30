export interface Schema {
  /**
  * Specifies the name of the component to be migrated.
  */
  name: string;
  /**
  * Specifies the location of the component.
  */
  componentPath?: string;
  /**
  * Specifies the module providing the component.
  */
  module?: string;
  /**
  * Specifies the module path providing the component.
  */
  modulePath?: string;
  /**
  * Notifies us that the component doesn't belong to any module.
  */
  skipModule?: boolean;
  
  nsext?: string;
  webext?: string;
  /**
  * Allows specification of the project to be updated
  */
  projectName?: string
}
