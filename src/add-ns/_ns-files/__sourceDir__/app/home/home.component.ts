import { Component, OnInit } from '@angular/core';

@Component({
  selector: '<%= prefix %>-home',
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  title = 'NativeScript';

  constructor() { }

  ngOnInit() {
  }
}
