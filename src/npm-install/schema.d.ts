export interface Schema {
  /**
   * A comma separated list of npm modules in the format name@version for each. i.e. '@angular/material@^5.2.0,@angular/cdk@^5.2.0'
   */
  dependencies?: string;
  
  /**
   * A comma separated list of npm modules in the format name@version for each. i.e. '@angular/material@^5.2.0,@angular/cdk@^5.2.0'
   */
  devDependencies?: string;

  /**
   * Stringified object containing dependencies and devDependencies, just like in the same format as in package.json
   * i.e.
   * { 
   *  dependecies: { "typescript": "^2.6.4" }, 
   *  devDependencies: { }
   * } 
   */
  json?: string;

  /**
   * The folder where npm install should be performed
   */
  workingDirectory: string;
}
