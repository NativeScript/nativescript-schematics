import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { ROUTES } from './app.routes';

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(ROUTES)],
  exports: [NativeScriptRouterModule]
})
export class AppRoutingModule { }
