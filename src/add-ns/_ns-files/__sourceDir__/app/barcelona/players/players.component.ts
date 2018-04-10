import { Component, OnInit } from '@angular/core';

import { Player } from '../player';
import { PlayerService } from '../player.service';

@Component({
  selector: 'ns-players',
  moduleId: module.id,
  templateUrl: './players.component.html',
})
export class PlayersComponent implements OnInit {
  players: Player[];
  
  // This pattern makes use of Angular’s dependency injection implementation to inject an instance of the ItemService service into this class. 
  // Angular knows about this service because it is included in your app’s main NgModule, defined in app.module.ts.
  constructor(private playerService: PlayerService) { }
  
  ngOnInit(): void {
    this.players = this.playerService.getPlayers();
  }
}
