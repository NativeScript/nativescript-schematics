import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule } from 'nativescript-angular/nativescript.module';

import { AppRoutingModule } from './app-routing.module<%= nsext %>';
import { <%= entryComponentClassName %> } from '<%= entryComponentImportPath %>';
<% if (sample) { %>
import { BarcelonaModule } from './barcelona/barcelona.module';<% } %>

// Uncomment and add to NgModule imports if you need to use two-way binding
// import { NativeScriptFormsModule } from 'nativescript-angular/forms';

// Uncomment and add to NgModule imports  if you need to use the HTTP wrapper
// import { NativeScriptHttpClientModule } from 'nativescript-angular/http-client';

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
