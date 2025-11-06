import { Component, Inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { sessionData } from '../session-data'
import { combineLatest, map, switchMap } from 'rxjs';
interface UserInfo {
  nickname: string;
  [key: string]: any;
}
@Component({
  selector: 'app-auth-button',
  template: `
    <ng-container *ngIf="auth.isAuthenticated$ | async; else loggedOut">
      <button class="btn border-0 text-white p-0 m-0" (click)="logout()">
        <i class="w-100 h-100" style="font-size: 1.5rem;" class="bi bi-box-arrow-left"></i>
      </button>
    </ng-container>

    <ng-template #loggedOut>
      <button class="btn border-0 text-white p-0 m-0" (click)="auth.loginWithRedirect({ authorizationParams: { ui_locales: 'ru', prompt:'login' } })">
        <i class="w-100 h-100" style="font-size: 1.5rem;" class="bi bi-box-arrow-in-right"></i>
      </button>
    </ng-template>
  `
})
export class AuthComponent {
  accessToken: string | null = null;
  constructor(@Inject(DOCUMENT) public document: Document, public auth: AuthService, private http: HttpClient) { }

  async ngOnInit() {
    await this.auth.user$.subscribe(user => {
      if (user) {
        if (user.nickname)
          sessionData.setNickname(user.nickname);

        sessionData.setRoles(user['https://roles.info.com/roles']);
      }
    })
   this.auth.getAccessTokenSilently().subscribe(
          (token) => {
              this.accessToken = token;
              console.log('Access Token:', token);
          },
          (error) => console.error('Error getting token', error)
      );
  }
  
  logout() {
    sessionData.clearAll();
    // Вызываем метод logout из AuthService
    this.auth.logout({ logoutParams: { returnTo: document.location.origin } });
  }
}
