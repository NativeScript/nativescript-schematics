import { Routes } from '@angular/router';

import { PlayersComponent } from './players/players.component';
import { PlayerDetailComponent } from './player-detail/player-detail.component';
import { PlayerService } from './player.service';

export const componentDeclarations: any[] = [
  PlayersComponent,
  PlayerDetailComponent
];

export const providerDeclarations: any[] = [
  PlayerService
];

export const routes: Routes = [
  { path: 'players', component: PlayersComponent },
  { path: 'player/:id', component: PlayerDetailComponent },
];
