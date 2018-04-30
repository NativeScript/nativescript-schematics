export interface Schema {
    /**
     * Specifies the name of the module to be generated.
     */
    name: string;
    /**
     * Specifies the file extension for {N} specific files.
     */
    nsext?: string;

    flat: boolean;
}
