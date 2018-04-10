import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule } from 'nativescript-angular/nativescript.module';
import { AppRoutingModule } from './app.routing<%= nsext %>';
import { <%= entryComponentName %> } from '<%= entryComponentImportPath %>';

import { BarcelonaModule } from './barcelona/barcelona.module';

@NgModule({
  bootstrap: [
    <%= entryComponentName %>
  ],
  imports: [
    NativeScriptModule,
    AppRoutingModule,
    BarcelonaModule
  ],
  declarations: [
    <%= entryComponentName %>
  ],
  providers: [
  ],
  schemas: [
    NO_ERRORS_SCHEMA
  ]
})
/*
Pass your application module to the bootstrapModule function located in main.ts to start your app
*/
export class <%= entryModuleName %> { }
