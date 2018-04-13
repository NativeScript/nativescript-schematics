import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { <%= entryComponentName %> } from '<%= entryComponentImportPath %>';


@NgModule({
  declarations: [
    <%= entryComponentName %>
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [<%= entryComponentName %>]
})
export class <%= entryModuleName %> { }
