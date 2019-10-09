import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from 'nativescript-angular/common';

@NgModule({
  imports: [
    NativeScriptCommonModule
  ],
  declarations: [
  ],
  providers: [
  ],
  schemas: [
    NO_ERRORS_SCHEMA
  ]
})
export class <%= classify(name) %>Module { }
