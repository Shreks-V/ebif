import { Component, ElementRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

interface NavbarNotification {
  titulo: string;
  detalle: string;
  tipo: 'info' | 'warning';
}

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ENCARGADO_ALMACEN: 'Encargado de almacén',
  DOCTOR: 'Doctor',
  OPERATIVO: 'Recepcionista',
  ADMIN: 'Administrador',
  ALMACEN: 'Encargado de almacén',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="bg-gradient-to-r from-[#00328b] via-[#0052cc] to-[#00328b] shadow-2xl sticky top-0 z-50 border-b-4 border-[#f3ad1c]">
      <div class="max-w-[1400px] mx-auto px-8">
        <div class="flex items-center justify-between h-16">

          <!-- Left: Logo -->
          <a routerLink="/dashboard" class="flex items-center gap-3 text-white no-underline flex-shrink-0">
            <div class="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[#0052cc]">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
              </svg>
            </div>
            <span class="font-bold text-white text-lg hidden sm:block">Espina Bífida</span>
          </a>

          <!-- Center: Navigation (desktop) -->
          <div class="hidden lg:flex items-center gap-1">
            <a routerLink="/dashboard"
               [class]="isActive('/dashboard') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Inicio
            </a>

            <a routerLink="/recibos"
               [class]="isActive('/recibos') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
              </svg>
              Recibos
            </a>

            <a routerLink="/registro-usuarios"
               [class]="isActive('/registro-usuarios') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Beneficiarios
            </a>

            <a routerLink="/citas"
               [class]="isActive('/citas') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              Citas
            </a>

            <a routerLink="/almacen"
               [class]="isActive('/almacen') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
              </svg>
              Almacen
            </a>

            <a routerLink="/reportes"
               [class]="isActive('/reportes') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
              </svg>
              Reportes
            </a>
          </div>

          <!-- Right: Notifications + User menu + Mobile hamburger -->
          <div class="flex items-center gap-3 relative">
            <!-- Notifications bell (desktop) -->
            <div class="hidden lg:block relative">
              <button (click)="$event.stopPropagation(); toggleNotifications()"
                      class="relative flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200 cursor-pointer"
                      title="Notificaciones">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
                </svg>
                <span *ngIf="notifications.length > 0"
                      class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#f3ad1c] text-[#00328b] text-[10px] font-black flex items-center justify-center">
                  {{ notifications.length > 9 ? '9+' : notifications.length }}
                </span>
              </button>

              <div *ngIf="notificationsOpen" class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p class="text-sm font-bold text-slate-800">Notificaciones</p>
                  <button (click)="refreshNotifications()" class="text-xs font-semibold text-[#00328b] hover:text-[#001f5e] cursor-pointer">Actualizar</button>
                </div>
                <div class="max-h-72 overflow-y-auto">
                  <div *ngIf="notifications.length === 0" class="px-4 py-6 text-sm text-slate-500 text-center">
                    Sin alertas por ahora.
                  </div>
                  <div *ngFor="let n of notifications" class="px-4 py-3 border-b border-slate-100 last:border-b-0">
                    <p class="text-sm font-bold" [class]="n.tipo === 'warning' ? 'text-amber-700' : 'text-slate-800'">{{ n.titulo }}</p>
                    <p class="text-xs text-slate-600 mt-0.5">{{ n.detalle }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- User menu (desktop) -->
            <div class="hidden lg:block relative">
              <button (click)="$event.stopPropagation(); toggleUserMenu()"
                      class="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 px-3 py-2 transition-all duration-200 cursor-pointer">
                <div class="w-8 h-8 rounded-lg bg-[#f3ad1c] text-[#00328b] font-black text-xs flex items-center justify-center">
                  {{ userInitials }}
                </div>
                <div class="text-left leading-tight">
                  <p class="text-xs font-bold max-w-[140px] truncate">{{ userName }}</p>
                  <p class="text-[11px] text-white/80">{{ userRole }}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              <div *ngIf="userMenuOpen" class="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div class="px-4 py-4 bg-slate-50 border-b border-slate-100">
                  <p class="text-sm font-black text-slate-900">{{ userName }}</p>
                  <p class="text-xs font-semibold text-slate-600">{{ userRole }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ userEmail }}</p>
                </div>

                <div class="p-2">
                  <button (click)="auth.logout()" class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                    Cerrar sesi&oacute;n
                  </button>
                </div>
              </div>
            </div>

            <!-- Mobile menu button -->
            <button (click)="mobileMenuOpen = !mobileMenuOpen; userMenuOpen = false; notificationsOpen = false"
                    class="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 cursor-pointer">
              <!-- Menu icon -->
              <svg *ngIf="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
              </svg>
              <!-- X icon -->
              <svg *ngIf="mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>

        </div>

        <!-- Mobile menu -->
        <div *ngIf="mobileMenuOpen" class="lg:hidden pb-4 flex flex-col gap-1">
          <a routerLink="/dashboard" (click)="mobileMenuOpen = false"
             [class]="isActive('/dashboard') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Inicio
          </a>

          <a routerLink="/recibos" (click)="mobileMenuOpen = false"
             [class]="isActive('/recibos') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
            </svg>
            Recibos
          </a>

          <a routerLink="/registro-usuarios" (click)="mobileMenuOpen = false"
             [class]="isActive('/registro-usuarios') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Beneficiarios
          </a>

          <a routerLink="/citas" (click)="mobileMenuOpen = false"
             [class]="isActive('/citas') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
            Citas
          </a>

          <a routerLink="/almacen" (click)="mobileMenuOpen = false"
             [class]="isActive('/almacen') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
            </svg>
            Almacen
          </a>

          <a routerLink="/reportes" (click)="mobileMenuOpen = false"
             [class]="isActive('/reportes') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
            </svg>
            Reportes
          </a>

          <div class="mt-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white">
            <p class="text-xs font-bold">Usuario</p>
            <p class="text-sm font-semibold truncate">{{ userName }}</p>
            <p class="text-xs text-white/80 truncate">{{ userEmail }}</p>
          </div>

          <div class="px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white">
            <p class="text-xs font-bold">Notificaciones</p>
            <p class="text-sm font-semibold">{{ notifications.length === 0 ? 'Sin alertas por ahora' : notifications.length + ' pendientes' }}</p>
          </div>

          <hr class="border-white/20 my-2">

          <button (click)="auth.logout()"
                  class="flex items-center gap-2 bg-white/10 hover:bg-red-600 text-white rounded-xl border border-white/20 px-5 py-2.5 font-semibold text-sm transition-all duration-200 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: []
})
export class NavbarComponent implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);
  private host = inject(ElementRef);
  auth = inject(AuthService);
  mobileMenuOpen = false;
  userMenuOpen = false;
  notificationsOpen = false;
  notifications: NavbarNotification[] = [];

  ngOnInit(): void {
    this.loadNotifications();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen && !this.notificationsOpen) return;
    const target = event.target as Node;
    if (!this.host.nativeElement.contains(target)) {
      this.userMenuOpen = false;
      this.notificationsOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen = false;
    this.notificationsOpen = false;
  }

  get userName(): string {
    return this.auth.getUser()?.nombre || 'Usuario';
  }

  get userRole(): string {
    const raw = (this.auth.getUser()?.rol || 'OPERATIVO').toString().toUpperCase();
    return ROLE_LABELS[raw] || raw;
  }

  get userEmail(): string {
    return this.auth.getUser()?.correo || 'sin-correo';
  }

  get userInitials(): string {
    const name = this.userName.trim();
    if (!name) return 'US';
    const parts = name.split(' ');
    const first = parts[0]?.charAt(0) || 'U';
    const second = parts[1]?.charAt(0) || 'S';
    return (first + second).toUpperCase();
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
    this.notificationsOpen = false;
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    this.userMenuOpen = false;
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.notifications = [];

    this.api.getCitasHoy().subscribe({
      next: (data: any) => {
        const citas = Array.isArray(data)
          ? data
          : (Array.isArray(data?.citas_hoy) ? data.citas_hoy : []);

        if (citas.length > 0) {
          this.notifications.push({
            titulo: 'Citas de hoy',
            detalle: `${citas.length} cita(s) programada(s) para hoy.`,
            tipo: 'info'
          });
        }
      },
      error: (err) => {
        console.error('Error al consultar citas de hoy para notificaciones:', err);
      }
    });

    this.api.getAlmacenStats().subscribe({
      next: (stats: any) => {
        const alertasStock = Number(stats?.alertas_stock_bajo ?? 0);
        const alertasCaducidad = Number(stats?.alertas_caducidad ?? 0);

        if (alertasStock > 0) {
          this.notifications.push({
            titulo: 'Inventario en riesgo',
            detalle: `${alertasStock} producto(s) con stock bajo.`,
            tipo: 'warning'
          });
        }

        if (alertasCaducidad > 0) {
          this.notifications.push({
            titulo: 'Próximos a caducar',
            detalle: `${alertasCaducidad} producto(s) próximos a caducar.`,
            tipo: 'warning'
          });
        }
      },
      error: (err) => {
        console.error('Error al consultar alertas de almacén para notificaciones:', err);
      }
    });
  }

  isActive(path: string): boolean {
    if (path === '/dashboard') {
      return this.router.url === '/dashboard' || this.router.url === '/';
    }
    return this.router.url.startsWith(path);
  }
}
