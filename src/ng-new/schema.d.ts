export interface Schema {
    /**
     * Specifies whether to generate a shared project or a {N} only
     */
    shared: boolean;
    /**
     * The name of the app.
     */
    name: string;
    /**
     * The path of the source directory.
     */
    sourceDir?: string;
    /**
     * Create a minimal app (empty template, no theme or routing).
     */
    minimal: boolean;
    /**
     * Generates a routing module.
     */
    routing: boolean;
    /**
     * The prefix to apply to generated selectors.
     */
    prefix: string;
    /**
     * The file extension to be used for style files.
     */
    style: string;
    /**
     * Specifies whether the {N} theme for styling should be included.
     */
    theme: boolean;
}
