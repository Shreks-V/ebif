import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { ConfigService } from './services/config.service';
import { EbifTitleStrategy } from './core/ebif-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: (cfg: ConfigService) => () => cfg.load(),
      deps: [ConfigService],
      multi: true,
    },
    { provide: TitleStrategy, useClass: EbifTitleStrategy },
  ],
};
