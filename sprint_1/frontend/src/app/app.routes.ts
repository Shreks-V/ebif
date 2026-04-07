import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'preregistro', loadComponent: () => import('./pages/pre-registro/pre-registro.component').then(m => m.PreRegistroComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'almacen', canActivate: [authGuard], loadComponent: () => import('./pages/almacen/almacen.component').then(m => m.AlmacenComponent) },
  { path: '**', redirectTo: '' },
];
