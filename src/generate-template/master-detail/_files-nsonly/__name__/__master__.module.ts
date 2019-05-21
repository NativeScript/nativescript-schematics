import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { NativeScriptRouterModule } from 'nativescript-angular/router';

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
