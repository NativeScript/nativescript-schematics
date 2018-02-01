export interface Schema {
    name: string;
    web?: boolean;
    nativescript?: boolean;
    path?: string;
    appRoot?: string;
    sourceDir?: string;
    routing?: boolean;
    routingScope?: ('Child' | 'Root');
    spec?: boolean;
    flat?: boolean;
    commonModule?: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
    /**
     * Allows specification of the used extension for {N}
     */
    nsExtension?: string;
    /**
     * Allows specification of the used extension for web
     */
    webExtension?: string;
}
