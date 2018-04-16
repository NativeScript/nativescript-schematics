export interface Schema {
  /**
   * Allows specification of the used extension for {N}
   */
  nsExtension: string;
  /**
   * Allows specification of the used extension for web
   */
  webExtension: string;
  /**
   * Used to specify if using ng cli v1, true by default
   */
  cliV1: boolean;
}
