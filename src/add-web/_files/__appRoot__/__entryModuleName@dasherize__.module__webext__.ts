import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { <%= entryComponentClassName %> } from '<%= entryComponentImportPath %>';


@NgModule({
  declarations: [
    <%= entryComponentClassName %>
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [<%= entryComponentClassName %>]
})
export class <%= entryModuleClassName %> { }
