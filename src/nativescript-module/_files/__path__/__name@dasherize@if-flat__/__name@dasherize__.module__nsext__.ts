import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';

import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
import { NativeScriptRouterModule } from 'nativescript-angular/router';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptFormsModule,
    NativeScriptRouterModule
  ],
  declarations: [
  ],
  schemas: [ NO_ERRORS_SCHEMA ]
})
export class <%= classify(name) %>Module { }
