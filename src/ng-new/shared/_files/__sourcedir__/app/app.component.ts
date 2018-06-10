import { Component } from '@angular/core';

@Component({
  selector: '<%= prefix %>-root',
  moduleId: module.id,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = '<%= name %>';
}
