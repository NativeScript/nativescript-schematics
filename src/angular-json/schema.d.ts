export interface Schema {
    /**
     * Specifies the name of the project.
     */
    name: string;

    /**
     * Specifies the destination path.
     */
    path?: string;

    /**
     * The prefix to apply to generated selectors.
     */
    prefix?: string;

    /**
     * The source root folder to be used in the generated angular project.
     */
    sourceRoot?: string;
 }
