import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Player } from '../player';
import { PlayerService } from '../player.service';

@Component({
  selector: 'ns-details',
  templateUrl: './player-detail.component.html',
})
export class PlayerDetailComponent implements OnInit {
  player: Player;
  
  constructor(
    private playerService: PlayerService,
    private route: ActivatedRoute
  ) { }
  
  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.player = this.playerService.getPlayer(id);
  }
}
