import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BarcelonaModule } from './barcelona/barcelona.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BarcelonaModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
