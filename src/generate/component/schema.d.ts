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
  * The path to create the component.
  */
  path?: string;
  /**
  * The name of the project.
  * The default option is the smart default 'projectName' provided by the Angular CLI.
  */
  project: string;
  /**
  * The name of the component.
  */
  name: string;
  /**
  * Specifies if the style will be in the ts file.
  */
  inlineStyle?: boolean;
  /**
  * Specifies if the template will be in the ts file.
  */
  inlineTemplate?: boolean;
  /**
  * Specifies the view encapsulation strategy.
  */
  viewEncapsulation?: ('Emulated' | 'Native' | 'None');
  /**
  * Specifies the change detection strategy.
  */
  changeDetection?: ('Default' | 'OnPush');
  /**
  * The prefix to apply to generated selectors.
  */
  prefix?: string;
  /**
  * The file extension to be used for style files.
  */
  styleext?: string;
  /**
  * Specifies if a spec file is generated.
  */
  spec?: boolean;
  /**
  * Flag to indicate if a dir is created.
  */
  flat?: boolean;
  /**
  * Flag to skip the module import.
  */
  skipImport?: boolean;
  /**
  * The selector to use for the component.
  */
  selector?: string;
  /**
  * Allows specification of the declaring module.
  */
  module?: string;
  /**
  * Specifies if declaring module exports the component.
  */
  export?: boolean;
  /**
  * Specifies if the component is an entry component of declaring module.
  */
  entryComponent?: boolean;
}
