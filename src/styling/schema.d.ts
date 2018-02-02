export interface Schema {
    /**
     * The path to the app.
     */
    appPath: string; 
    /**
     * The path of the source directory.
     */
    sourceDir: string;
    /**
     * The file extension to be used for style files.
     * Supported are css and scss.
     */
    extension: string;
    /**
     * Specifies whether the {N} theme should be included.
     */
    theme: boolean;
}
