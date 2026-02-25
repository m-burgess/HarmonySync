import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';
import { provideIcons } from '@ng-icons/core';
import {
  heroPresentationChartBar,
  heroCog,
  heroAdjustmentsHorizontal,
  heroMusicalNote,
  heroClock,
  heroComputerDesktop,
  heroTv,
  heroWindow,
  heroChevronRight,
  heroChevronDown,
  heroArrowDownTray,
  heroCheckCircle,
  heroPencil,
  heroMagnifyingGlass,
  heroPlay,
  heroPause,
  heroStop,
  heroTrash,
  heroPlus,
  heroArrowPath,
  heroQueueList
} from '@ng-icons/heroicons/outline';
import {
  heroComputerDesktopSolid,
  heroTvSolid,
  heroWindowSolid,
  heroPlaySolid,
  heroPauseSolid,
  heroStopSolid,
  heroArrowPathSolid,
  heroArrowUpTraySolid,
  heroQueueListSolid
} from '@ng-icons/heroicons/solid';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideMonacoEditor(),
    provideIcons({
      heroPresentationChartBar,
      heroCog,
      heroAdjustmentsHorizontal,
      heroMusicalNote,
      heroClock,
      heroComputerDesktop,
      heroTv,
      heroWindow,
      heroChevronRight,
      heroChevronDown,
      heroArrowDownTray,
      heroCheckCircle,
      heroPencil,
      heroMagnifyingGlass,
      heroPlay,
      heroPause,
      heroStop,
      heroTrash,
      heroPlus,
      heroArrowPath,
      heroQueueList,
      heroComputerDesktopSolid,
      heroTvSolid,
      heroWindowSolid,
      heroPlaySolid,
      heroPauseSolid,
      heroStopSolid,
      heroArrowPathSolid,
      heroArrowUpTraySolid,
      heroQueueListSolid
    })
  ],
};
