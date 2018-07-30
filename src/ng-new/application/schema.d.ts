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
     * Create a minimal app (empty template, no theme).
     */
    minimal: boolean;
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
