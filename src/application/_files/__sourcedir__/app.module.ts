import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule } from 'nativescript-angular/nativescript.module';<% if (routing) { %>
import { AppRoutingModule } from './app-routing.module';

import { ItemService } from "./item/item.service";
import { ItemsComponent } from "./item/items.component";
import { ItemDetailComponent } from "./item/item-detail.component";<% } %>

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
      AppComponent,<% if (routing) { %>
      ItemsComponent,
      ItemDetailComponent,<% } %>
  ],
  imports: [
      NativeScriptModule,<% if (routing) { %>
      AppRoutingModule,<% } %>
  ],<% if (routing) { %>
  providers: [
      ItemService,
  ],<% } %>
  bootstrap: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppModule {}

