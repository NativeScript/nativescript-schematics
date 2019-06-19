import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from '@src/app/app-routing.module';
import { AppComponent } from '@src/app/app.component';
import { HomeComponent } from '@src/app/home/home.component';
<% if (sample) { %>
import { BarcelonaModule } from '@src/app/barcelona/barcelona.module';<% } %>

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
