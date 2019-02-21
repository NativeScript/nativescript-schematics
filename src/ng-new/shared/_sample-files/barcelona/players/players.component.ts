import { Component, OnInit } from '@angular/core';

import { Player } from '@src/app/barcelona/player.model';
import { PlayerService } from '@src/app/barcelona/player.service';

@Component({
  selector: '<%= prefix %>-players',
  templateUrl: './players.component.html',
})
export class PlayersComponent implements OnInit {
  players: Player[];

  constructor(private playerService: PlayerService) { }

  ngOnInit(): void {
    this.players = this.playerService.getPlayers();
  }
}
