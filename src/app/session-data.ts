import { BehaviorSubject } from 'rxjs';

export const sessionData = {
  nickname$: new BehaviorSubject<string | null>(null),
  roles$: new BehaviorSubject<string[]>([]),

  setNickname(name: string) {
    this.nickname$.next(name);
  },

  setRoles(roles: string[]) {
    this.roles$.next(roles);
  },

  getNickname() {
    return this.nickname$.value
  },
  getRoles() {
    return this.roles$.value
  },
  clearNickname() {
    this.nickname$.next(null);
  },

  clearRoles() {
    this.roles$.next([]);
  },
  clearAll() {
    this.clearNickname();
    this.clearRoles();
  }
};
