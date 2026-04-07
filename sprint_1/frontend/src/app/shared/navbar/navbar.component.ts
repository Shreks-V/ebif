import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
            <div class="hidden sm:flex flex-col">
              <span class="font-bold text-white text-lg leading-tight">Espina Bifida</span>
              <span class="text-[#f3ad1c] text-[10px] font-semibold tracking-wider uppercase">Sprint 1</span>
            </div>
          </a>

          <!-- Center: Navigation (desktop) - Solo modulos Sprint 1 -->
          <div class="hidden lg:flex items-center gap-1">
            <a routerLink="/dashboard"
               [class]="isActive('/dashboard') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Dashboard
            </a>

            <a routerLink="/almacen"
               [class]="isActive('/almacen') ? 'bg-[#f3ad1c] text-white shadow-lg scale-105' : 'text-white/90 hover:text-white hover:bg-white/10'"
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 no-underline whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
              </svg>
              Almacen
            </a>
          </div>

          <!-- Right: Logout + Mobile hamburger -->
          <div class="flex items-center gap-3">
            <button (click)="auth.logout()"
                    class="hidden lg:flex items-center gap-2 bg-white/10 hover:bg-red-600 text-white rounded-xl border border-white/20 px-4 py-2.5 font-semibold text-sm transition-all duration-200 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
              Salir
            </button>

            <!-- Mobile menu button -->
            <button (click)="mobileMenuOpen = !mobileMenuOpen"
                    class="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 cursor-pointer">
              <svg *ngIf="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
              </svg>
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
            Dashboard
          </a>

          <a routerLink="/almacen" (click)="mobileMenuOpen = false"
             [class]="isActive('/almacen') ? 'bg-[#f3ad1c] text-white shadow-lg' : 'text-white/90 hover:text-white hover:bg-white/10'"
             class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm no-underline">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
            </svg>
            Almacen
          </a>

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
export class NavbarComponent {
  private router = inject(Router);
  auth = inject(AuthService);
  mobileMenuOpen = false;

  isActive(path: string): boolean {
    if (path === '/dashboard') {
      return this.router.url === '/dashboard' || this.router.url === '/';
    }
    return this.router.url.startsWith(path);
  }
}
