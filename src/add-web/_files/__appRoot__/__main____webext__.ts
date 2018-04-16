import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { <%= entryModuleName %> } from '<%= entryModuleImportPath %>';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(<%= entryModuleName %>)
  .catch(err => console.log(err));
