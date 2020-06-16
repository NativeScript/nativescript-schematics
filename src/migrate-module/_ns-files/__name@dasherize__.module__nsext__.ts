import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

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
