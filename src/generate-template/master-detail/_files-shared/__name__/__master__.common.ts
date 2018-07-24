import { Routes } from '@angular/router';

import { <%= masterClassName %>Component } from './<%= master %>/<%= master %>.component';
import { <%= detailClassName %>DetailComponent } from './<%= detail %>-detail/<%= detail %>-detail.component';
import { DataService } from './data.service';

export const COMPONENT_DECLARATIONS: any[] = [
  <%= masterClassName %>Component,
  <%= detailClassName %>DetailComponent
];

export const PROVIDERS_DECLARATIONS: any[] = [
  DataService
];

export const ROUTES: Routes = [
  { path: '<%= master %>', component: <%= masterClassName %>Component },
  { path: '<%= detail %>/:id', component: <%= detailClassName %>DetailComponent },
];
