import { Routes } from '@angular/router';

import { HomeComponent } from '@src/app/home/home.component';

export const routes: Routes = [
  {
      path: '',
      redirectTo: <% if (sample) { %>'/players'<% } else { %>'/home'<% } %>,
      pathMatch: 'full',
  },
  {
      path: 'home',
      component: HomeComponent,
  },
];
