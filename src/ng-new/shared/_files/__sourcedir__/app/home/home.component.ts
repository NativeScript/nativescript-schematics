import { Component, OnInit } from '@angular/core';

@Component({
  selector: '<%= prefix %>-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.<%= style %>'],
})
export class HomeComponent implements OnInit {
  title = '<%= name %>';

  constructor() { }

  ngOnInit() {
  }
}
