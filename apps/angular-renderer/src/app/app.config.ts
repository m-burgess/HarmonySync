import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
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
  heroArrowPath
} from '@ng-icons/heroicons/outline';
import {
  heroComputerDesktopSolid,
  heroTvSolid,
  heroWindowSolid,
  heroPlaySolid,
  heroPauseSolid,
  heroStopSolid,
  heroArrowPathSolid,
  heroArrowUpTraySolid
} from '@ng-icons/heroicons/solid';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
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
      heroComputerDesktopSolid,
      heroTvSolid,
      heroWindowSolid,
      heroPlaySolid,
      heroPauseSolid,
      heroStopSolid,
      heroArrowPathSolid,
      heroArrowUpTraySolid
    })
  ],
};
