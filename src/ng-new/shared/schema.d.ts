export interface Schema {
    /**
     * The name of the app.
     */
    name: string;
    /**
     * The path of the source directory.
     */
    sourceDir: string;
    /**
     * The prefix to apply to generated selectors.
     */
    prefix: string;
}
