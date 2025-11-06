import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
/*
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAuth0 } from '@auth0/auth0-angular';
import { AppComponent } from './app/app.component';*/
/*
bootstrapApplication(AppComponent, {
  providers: [
    provideAuth0({
      domain: 'dev-qkvu2gwk1shvhz5e.us.auth0.com',
      clientId: 'dJp2f440fMu0WSwUrSV9JxHzkIahGZJy',
      authorizationParams: {
        redirect_uri: 'http://localhost:4200/map',
        ui_locales: 'ru'
      }
    }),
  ]
});*/
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
