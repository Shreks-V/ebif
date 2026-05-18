import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', title: 'Iniciar Sesión', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'preregistro', title: 'Pre-Registro', loadComponent: () => import('./pages/pre-registro/pre-registro.component').then(m => m.PreRegistroComponent) },
  { path: 'dashboard', title: 'Dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'registro-usuarios', title: 'Beneficiarios', canActivate: [authGuard], loadComponent: () => import('./pages/beneficiarios/beneficiarios.component').then(m => m.BeneficiariosComponent) },
  { path: 'citas', title: 'Citas', canActivate: [authGuard], loadComponent: () => import('./pages/citas/citas.component').then(m => m.CitasComponent) },
  { path: 'almacen', title: 'Almacén', canActivate: [authGuard], loadComponent: () => import('./pages/almacen/almacen.component').then(m => m.AlmacenComponent) },
  { path: 'recibos', title: 'Recibos', canActivate: [authGuard], loadComponent: () => import('./pages/recibos/recibos.component').then(m => m.RecibosComponent) },
  { path: 'reportes', title: 'Reportes', canActivate: [authGuard], loadComponent: () => import('./pages/reportes/reportes.component').then(m => m.ReportesComponent) },
  { path: 'perfil', title: 'Mi Perfil', canActivate: [authGuard], loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent) },
  { path: 'usuarios-sistema', title: 'Usuarios del Sistema', canActivate: [authGuard], loadComponent: () => import('./pages/usuarios-sistema/usuarios-sistema.component').then(m => m.UsuariosSistemaComponent) },
  { path: 'mapa', redirectTo: 'reportes', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
