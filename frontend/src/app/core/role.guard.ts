import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

const ADMIN_ROLES = new Set(['ADMINISTRADOR', 'ADMIN']);

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/']);
    return false;
  }

  const rol = (auth.getUser()?.rol || '').toString().toUpperCase();
  if (ADMIN_ROLES.has(rol)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
