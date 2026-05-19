import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { CambiarContrasenaModalComponent } from './modals/cambiar-contrasena-modal.component';
import { Beneficiario } from '../../shared/models/beneficiario.models';

interface NavbarNotification {
  id: string;
  categoria: 'citas' | 'membresias' | 'almacen';
  tipo: 'info' | 'warning';
  titulo: string;
  detalle: string;
  count: number;
  link: string;
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
  imports: [CommonModule, FormsModule, RouterLink, CambiarContrasenaModalComponent],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private api = inject(ApiService);
  private host = inject(ElementRef);
  auth = inject(AuthService);
  mobileMenuOpen = false;
  userMenuOpen = false;
  notificationsOpen = false;
  notifications: NavbarNotification[] = [];
  dismissedIds = new Set<string>();
  notifLoading = false;

  // Global search
  searchOpen = false;
  searchQuery = '';
  searchResults: Beneficiario[] = [];
  searchLoading = false;
  private _searchDebounce: ReturnType<typeof setTimeout> | null = null;

  // Cambiar contraseña
  showCambiarPass = false;

  lastRefresh = '';
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadNotifications();
    this.refreshInterval = setInterval(() => this.loadNotifications(), 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this._searchDebounce) clearTimeout(this._searchDebounce);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen && !this.notificationsOpen && !this.searchOpen) return;
    const target = event.target as Node;
    if (!this.host.nativeElement.contains(target)) {
      this.userMenuOpen = false;
      this.notificationsOpen = false;
      if (this.searchOpen) this.closeSearch();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.userMenuOpen = false;
      this.notificationsOpen = false;
      if (this.searchOpen) this.closeSearch();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this.searchOpen ? this.closeSearch() : this.openSearch();
    }
  }

  get visibleNotifications(): NavbarNotification[] {
    return this.notifications.filter(n => !this.dismissedIds.has(n.id));
  }

  get userName(): string { return this.auth.getUser()?.nombre || 'Usuario'; }

  get userRole(): string {
    const raw = (this.auth.getUser()?.rol || 'OPERATIVO').toString().toUpperCase();
    return ROLE_LABELS[raw] || raw;
  }

  get userEmail(): string { return this.auth.getUser()?.correo || 'sin-correo'; }

  get userInitials(): string {
    const name = this.userName.trim();
    if (!name) return 'US';
    const parts = name.split(' ');
    return ((parts[0]?.charAt(0) || 'U') + (parts[1]?.charAt(0) || 'S')).toUpperCase();
  }

  get isAdmin(): boolean {
    return ['ADMINISTRADOR', 'ADMIN'].includes(
      (this.auth.getUser()?.rol || '').toString().toUpperCase()
    );
  }

  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; this.notificationsOpen = false; }
  toggleNotifications(): void { this.notificationsOpen = !this.notificationsOpen; this.userMenuOpen = false; }
  refreshNotifications(): void { this.loadNotifications(); }

  navegarNotificacion(n: NavbarNotification): void {
    this.notificationsOpen = false;
    this.router.navigate([n.link]);
  }

  dismissNotification(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.dismissedIds.add(id);
  }

  openSearch(): void {
    this.searchOpen = true;
    this.searchQuery = '';
    this.searchResults = [];
    this.userMenuOpen = false;
    this.notificationsOpen = false;
  }

  closeSearch(): void {
    this.searchOpen = false;
    this.searchQuery = '';
    this.searchResults = [];
  }

  onSearchInput(): void {
    if (this._searchDebounce) clearTimeout(this._searchDebounce);
    if (this.searchQuery.length < 2) { this.searchResults = []; return; }
    this._searchDebounce = setTimeout(() => {
      this.searchLoading = true;
      this.api.getBeneficiarios({ busqueda: this.searchQuery, membresia_estatus: 'ACTIVO', limit: 8 }).subscribe({
        next: (data: Beneficiario[]) => { this.searchResults = data || []; this.searchLoading = false; },
        error: () => { this.searchResults = []; this.searchLoading = false; },
      });
    }, 300);
  }

  submitSearch(): void { this.irABeneficiario(); }

  irABeneficiario(): void {
    this.closeSearch();
    this.router.navigate(['/registro-usuarios']);
  }

  openCambiarPass(): void { this.showCambiarPass = true; }

  isActive(path: string): boolean {
    if (path === '/dashboard') return this.router.url === '/dashboard' || this.router.url === '/';
    return this.router.url.startsWith(path);
  }

  private loadNotifications(): void {
    this.notifLoading = true;
    this.api.getNotificaciones().subscribe({
      next: (data: NavbarNotification[]) => {
        this.notifications = data || [];
        this.notifLoading = false;
        const now = new Date();
        this.lastRefresh = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      },
      error: () => { this.notifLoading = false; },
    });
  }
}
