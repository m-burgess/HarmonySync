import { Routes } from '@angular/router';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { AudienceScreenComponent } from './components/screens/audience-screen/audience-screen.component';
import { ConfidenceMonitorComponent } from './components/screens/confidence-monitor/confidence-monitor.component';
import { LowerThirdsScreenComponent } from './components/screens/lower-thirds-screen/lower-thirds-screen.component';

export const routes: Routes = [
    { path: '', component: MainLayoutComponent },
    { path: 'audience', component: AudienceScreenComponent },
    { path: 'confidence', component: ConfidenceMonitorComponent },
    { path: 'lower-thirds', component: LowerThirdsScreenComponent },
    { path: 'preservice', loadComponent: () => import('./components/screens/preservice-music/preservice-music.component').then(m => m.PreServiceMusicComponent) },
    { path: '**', redirectTo: '' }
];
