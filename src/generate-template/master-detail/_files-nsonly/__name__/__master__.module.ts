import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptCommonModule, NativeScriptRouterModule } from '@nativescript/angular';

import { <%= masterClassName %>Component } from './<%= master %>/<%= master %>.component';
import { <%= detailClassName %>DetailComponent } from './<%= detail %>-detail/<%= detail %>-detail.component';

export const routes: Routes = [
  { path: '<%= master %>', component: <%= masterClassName %>Component },
  { path: '<%= detail %>/:id', component: <%= detailClassName %>DetailComponent },
];

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forRoot(routes)
  ],
  exports: [
    NativeScriptRouterModule
  ],
  declarations: [
    <%= masterClassName %>Component,
    <%= detailClassName %>DetailComponent
  ],
  schemas: [
    NO_ERRORS_SCHEMA
  ]
})
export class <%= masterClassName %>Module { }
