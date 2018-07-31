import { Routes } from '@angular/router';

import { PlayersComponent } from "./players/players.component";
import { PlayerDetailComponent } from "./player-detail/player-detail.component";
import { PlayerService } from './player.service';

export const COMPONENT_DECLARATIONS: any[] = [
  PlayersComponent,
  PlayerDetailComponent
];

export const PROVIDERS_DECLARATIONS: any[] = [
  PlayerService
];

export const ROUTES: Routes = [
  { path: 'players', component: PlayersComponent },
  { path: 'player/:id', component: PlayerDetailComponent },
];
