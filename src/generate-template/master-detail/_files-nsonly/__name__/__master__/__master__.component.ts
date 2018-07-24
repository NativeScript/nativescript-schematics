import { Component, OnInit } from '@angular/core';

import { DataService, Number } from '../data.service';

@Component({
  selector: '<%= prefix %>-<%= master %>',
  moduleId: module.id,
  templateUrl: './<%= master %>.component.html',
})
export class <%= masterClassName %>Component implements OnInit {
  numbers: Number[];

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    this.numbers = this.dataService.getNumbers();
  }
}
