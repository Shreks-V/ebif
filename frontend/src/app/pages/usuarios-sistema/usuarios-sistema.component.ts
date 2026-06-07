import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UsuarioSistema } from '../../shared/models/usuario-sistema.models';
import { getApiError } from '../../shared/utils/error.utils';
import { TOAST_DURATION_MS } from '../../shared/constants/app.constants';

interface UsuarioFormData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  rol: string;
  estatus: string;
  contrasena: string;
}

const ROLES = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'RECEPCIONISTA', label: 'Recepcionista' },
  { value: 'ENCARGADO_ALMACEN', label: 'Encargado de Almacén' },
  { value: 'DOCTOR', label: 'Doctor' },
];

const ROL_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ENCARGADO_ALMACEN: 'Encargado de Almacén',
  DOCTOR: 'Doctor',
};

@Component({
  selector: 'app-usuarios-sistema',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './usuarios-sistema.component.html',
})
export class UsuariosSistemaComponent implements OnInit {
  usuarios: UsuarioSistema[] = [];
  page = 1;
  readonly pageSize = 10;
  get usuariosPaginados(): UsuarioSistema[] {
    return this.usuarios.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.ceil(this.usuarios.length / this.pageSize) || 1; }
  get start(): number { return (this.page - 1) * this.pageSize; }
  get end(): number { return Math.min(this.start + this.pageSize, this.usuarios.length); }
  loading = false;
  globalMsg = '';
  globalMsgType: 'success' | 'error' = 'success';

  roles = ROLES;

  // Form modal
  showFormModal = false;
  editMode = false;
  editTarget: UsuarioSistema | null = null;
  formData: UsuarioFormData = { nombre: '', apellido_paterno: '', apellido_materno: '', correo: '', rol: '', estatus: 'ACTIVO', contrasena: '' };
  formLoading = false;
  formError = '';

  // Reset modal
  showResetModal = false;
  resetTarget: UsuarioSistema | null = null;
  resetNueva = '';
  resetLoading = false;
  resetError = '';
  resetSuccess = false;

  get currentUserId(): number {
    return this.auth.getUser()?.id_usuario ?? -1;
  }

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService, private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.api.listarUsuariosSistema()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.usuarios = data || []; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  initials(u: UsuarioSistema): string {
    const n = (u.nombre || '').charAt(0).toUpperCase();
    const a = (u.apellido_paterno || '').charAt(0).toUpperCase();
    return n + a || 'US';
  }

  rolLabel(rol: string): string {
    return ROL_LABELS[rol] ?? rol;
  }

  openCreateModal(): void {
    this.editMode = false;
    this.editTarget = null;
    this.formData = { nombre: '', apellido_paterno: '', apellido_materno: '', correo: '', rol: 'RECEPCIONISTA', estatus: 'ACTIVO', contrasena: '' };
    this.formError = '';
    this.showFormModal = true;
  }

  openEditModal(u: UsuarioSistema): void {
    this.editMode = true;
    this.editTarget = u;
    this.formData = { nombre: u.nombre || '', apellido_paterno: u.apellido_paterno || '', apellido_materno: u.apellido_materno || '', correo: '', rol: u.rol || 'RECEPCIONISTA', estatus: u.estatus || 'ACTIVO', contrasena: '' };
    this.formError = '';
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  submitForm(): void {
    this.formError = '';
    if (!this.formData.nombre?.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.editMode && !this.formData.correo?.trim()) { this.formError = 'El correo es obligatorio.'; return; }
    if (!this.editMode && (!this.formData.contrasena || this.formData.contrasena.length < 8)) { this.formError = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    if (!this.formData.rol) { this.formError = 'Selecciona un rol.'; return; }

    this.formLoading = true;
    const obs = this.editMode
      ? this.api.actualizarUsuarioSistema(this.editTarget!.id_usuario, {
          nombre: this.formData.nombre,
          apellido_paterno: this.formData.apellido_paterno || null,
          apellido_materno: this.formData.apellido_materno || null,
          rol: this.formData.rol,
          estatus: this.formData.estatus,
        })
      : this.api.crearUsuarioSistema({
          nombre: this.formData.nombre,
          apellido_paterno: this.formData.apellido_paterno || null,
          apellido_materno: this.formData.apellido_materno || null,
          correo: this.formData.correo,
          rol: this.formData.rol,
          estatus: 'ACTIVO',
          contrasena: this.formData.contrasena,
        });

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formLoading = false;
        this.showFormModal = false;
        this.showGlobalMsg(this.editMode ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.', 'success');
        this.cargarUsuarios();
      },
      error: (err: unknown) => {
        this.formLoading = false;
        this.formError = getApiError(err, 'Error al guardar el usuario.');
      },
    });
  }

  toggleEstatus(u: UsuarioSistema): void {
    const nuevoEstatus = u.estatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.api.actualizarUsuarioSistema(u.id_usuario, {
      nombre: u.nombre,
      apellido_paterno: u.apellido_paterno || null,
      apellido_materno: u.apellido_materno || null,
      rol: u.rol,
      estatus: nuevoEstatus,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        u.estatus = nuevoEstatus;
        this.showGlobalMsg(`Usuario ${nuevoEstatus === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`, 'success');
      },
      error: (err: unknown) => {
        this.showGlobalMsg(getApiError(err, 'Error al cambiar el estatus.'), 'error');
      },
    });
  }

  openResetModal(u: UsuarioSistema): void {
    this.resetTarget = u;
    this.resetNueva = '';
    this.resetError = '';
    this.resetSuccess = false;
    this.showResetModal = true;
  }

  closeResetModal(): void {
    this.showResetModal = false;
  }

  submitReset(): void {
    this.resetError = '';
    if (!this.resetNueva || this.resetNueva.length < 8) {
      this.resetError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    this.resetLoading = true;
    this.api.adminResetContrasena(this.resetTarget!.id_usuario, { contrasena_nueva: this.resetNueva })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.resetLoading = false; this.resetSuccess = true; },
        error: (err: unknown) => { this.resetLoading = false; this.resetError = getApiError(err, 'Error al restablecer la contraseña.'); },
      });
  }

  private showGlobalMsg(msg: string, type: 'success' | 'error'): void {
    this.globalMsg = msg;
    this.globalMsgType = type;
    setTimeout(() => { this.globalMsg = ''; }, TOAST_DURATION_MS);
  }
}
