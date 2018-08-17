export interface Schema {
  /**
  * Allows specification of the used extension for {N}
  */
  nsExtension?: string;
  /**
  * Allows specification of the used extension for web
  */
  webExtension?: string;
  
  /**
  * Can be used in a code sharing project,
  * to skip generation of web specific files:
  * --no-web or --web=false
  * Don't use in a {N} only project
  */
  web?: boolean,
  
  /**
  * Can be used in a code sharing project,
  * to skip generation of nativescript specific files:
  * --no-nativescript or --nativescript=false
  * Don't use in a {N} only project
  */
  nativescript?: boolean,
  
  /**
  * The name of the module.
  */
  name: string;
  /**
  * The path to create the pipe.
  */
  path?: string;
  /**
  * The name of the project.
  */
  project: string;
  /**
  * Generates a routing module.
  */
  routing?: boolean;
  /**
  * The scope for the generated routing.
  */
  routingScope?: ('Child' | 'Root');
  /**
  * Specifies if a spec file is generated.
  */
  spec?: boolean;
  /**
  * Flag to indicate if a dir is created.
  */
  flat?: boolean;
  /**
   * FLag to control if a common file is created.
   */
  common?: boolean;
  /**
  * Flag to control whether the CommonModule is imported.
  */
  commonModule?: boolean;
  /**
  * Allows specification of the declaring module.
  */
  module?: string;
}
