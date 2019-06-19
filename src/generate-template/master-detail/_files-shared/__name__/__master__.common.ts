import { Routes } from '@angular/router';

import { <%= masterClassName %>Component } from './<%= master %>/<%= master %>.component';
import { <%= detailClassName %>DetailComponent } from './<%= detail %>-detail/<%= detail %>-detail.component';

export const componentDeclarations: any[] = [
  <%= masterClassName %>Component,
  <%= detailClassName %>DetailComponent
];

export const routes: Routes = [
  { path: '<%= master %>', component: <%= masterClassName %>Component },
  { path: '<%= detail %>/:id', component: <%= detailClassName %>DetailComponent },
];
