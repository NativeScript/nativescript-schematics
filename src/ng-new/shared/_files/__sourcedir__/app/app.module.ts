import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
<% if (sample) { %>
import { BarcelonaModule } from './barcelona/barcelona.module';<% } %>

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,<% if (sample) { %>
    BarcelonaModule,<% } %>
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
