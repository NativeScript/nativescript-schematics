export interface Schema {
    /**
     * Specifies the name of the module to be migrated.
     */
    name: string;
    /**
     * Specifies the module path.
     */
    modulePath?: string;
    nsext?: string;
}
