import { Routes } from '@angular/router';

import { <%= masterClassName %>Component } from './<%= master %>/<%= master %>.component';
import { <%= detailClassName %>DetailComponent } from './<%= detail %>-detail/<%= detail %>-detail.component';
import { DataService } from './data.service';

export const componentDeclarations: any[] = [
  <%= masterClassName %>Component,
  <%= detailClassName %>DetailComponent
];

export const providerDeclarations: any[] = [
  DataService
];

export const routes: Routes = [
  { path: '<%= master %>', component: <%= masterClassName %>Component },
  { path: '<%= detail %>/:id', component: <%= detailClassName %>DetailComponent },
];
