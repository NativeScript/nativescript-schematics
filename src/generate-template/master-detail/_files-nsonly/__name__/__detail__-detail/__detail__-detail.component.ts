import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DataService, Number } from '../data.service';

@Component({
  selector: '<%= prefix %>-details',
  moduleId: module.id,
  templateUrl: './<%= detail %>-detail.component.html',
})
export class <%= detailClassName %>DetailComponent implements OnInit {
  item: Number;

  constructor(
    private dataService: DataService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.item = this.dataService.getNumber(id);
  }
}
