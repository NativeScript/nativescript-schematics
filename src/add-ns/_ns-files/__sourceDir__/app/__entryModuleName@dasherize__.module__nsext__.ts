import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule } from '@nativescript/angular';

import { AppRoutingModule } from './app-routing.module<%= nsext %>';
import { <%= entryComponentClassName %> } from '<%= entryComponentImportPath %>';
<% if (sample) { %>
import { BarcelonaModule } from './barcelona/barcelona.module';<% } %>

// Uncomment and add to NgModule imports if you need to use two-way binding and/or HTTP wrapper
// import { NativeScriptFormsModule, NativeScriptHttpClientModule } from '@nativescript/angular';

@NgModule({
  declarations: [
    <%= entryComponentClassName %>,
  ],
  imports: [
    NativeScriptModule,
    AppRoutingModule,<% if (sample) { %>
    BarcelonaModule,<% } %>
  ],
  providers: [],
  bootstrap: [<%= entryComponentClassName %>],
  schemas: [NO_ERRORS_SCHEMA]
})
/*
Pass your application module to the bootstrapModule function located in main.ts to start your app
*/
export class <%= entryModuleClassName %> { }
