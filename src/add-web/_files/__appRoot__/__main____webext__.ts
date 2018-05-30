import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { <%= entryModuleClassName %> } from '<%= entryModuleImportPath %>';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(<%= entryModuleClassName %>)
  .catch(err => console.log(err));
