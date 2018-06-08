import { Component, OnInit } from '@angular/core';

import { Item } from './item';
import { ItemService } from './item.service';

@Component({
    selector: '<%= prefix %>-items',
    moduleId: module.id,
    templateUrl: './items.component.html',
})
export class ItemsComponent implements OnInit {
    items: Item[];

    constructor(private itemService: ItemService) { }

    ngOnInit() {
        this.items = this.itemService.getItems();
    }
}
