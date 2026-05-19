import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { ServicioRaw } from '../../../../shared/models/almacen.models';
import { NuevoMedicoModalComponent } from './modals/nuevo-medico-modal.component';
import { DetalleMedicoModalComponent } from './modals/detalle-medico-modal.component';
import { EditarMedicoModalComponent } from './modals/editar-medico-modal.component';
import { DisponibilidadModalComponent } from './modals/disponibilidad-modal.component';

interface TableSortState { key: string; direction: 'asc' | 'desc'; }

interface MedicoServicioLocal { idServicio: number; nombre: string; }
interface MedicoLocal {
  idDoctor: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  especialidad: string;
  telefono: string;
  correo: string;
  activo: 'S' | 'N';
  servicios: MedicoServicioLocal[];
  iniciales: string;
}

@Component({
  selector: 'app-medicos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NuevoMedicoModalComponent, DetalleMedicoModalComponent, EditarMedicoModalComponent, DisponibilidadModalComponent],
  templateUrl: './medicos-tab.component.html',
})
export class MedicosTabComponent implements OnInit, OnDestroy {
  searchMedicos = '';
  medicos: MedicoLocal[] = [];
  medicosFiltrados: MedicoLocal[] = [];
  serviciosList: ServicioRaw[] = [];
  medicosSort: TableSortState = { key: 'nombre', direction: 'asc' };

  showNuevoMedicoModal = false;
  medicoParaDetalle: MedicoLocal | null = null;
  medicoParaEditar: MedicoLocal | null = null;
  medicoParaDisponibilidad: MedicoLocal | null = null;

  // Context menu
  openMedicoMenu: number | null = null;
  menuMedicoPosition = { top: 0, left: 0 };
  menuMedico: MedicoLocal | null = null;
  private medicoMenuTriggerElement: HTMLElement | null = null;
  private readonly actionMenuWidth = 192;
  private readonly medicoMenuEstimatedHeight = 260;
  private readonly actionMenuGap = 6;
  private readonly actionMenuViewportPadding = 8;
  private readonly _onViewportChange = (): void => { this._repositionMedicoMenu(); };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this._cargarDoctores();
    this.api.getServicios().subscribe({
      next: (data) => { this.serviciosList = data; },
      error: (err) => console.error('Error al cargar servicios:', err),
    });
    window.visualViewport?.addEventListener('resize', this._onViewportChange, { passive: true });
    window.visualViewport?.addEventListener('scroll', this._onViewportChange, { passive: true });
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this._onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this._onViewportChange);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this._repositionMedicoMenu(); }

  // ── Filters / Sort ──

  filtrarMedicos(): void {
    const valueGetter = (medico: MedicoLocal, key: string): unknown => {
      switch (key) {
        case 'nombre': return `${medico.nombre} ${medico.apellidoPaterno} ${medico.apellidoMaterno || ''}`;
        case 'especialidad': return medico.especialidad;
        case 'contacto': return `${medico.telefono || ''} ${medico.correo || ''}`;
        case 'servicios': return (medico.servicios || []).map((s: MedicoServicioLocal) => s.nombre).join(', ');
        case 'estado': return medico.activo;
        default: return medico.nombre;
      }
    };
    if (!this.searchMedicos) {
      this.medicosFiltrados = this._sortRows(this.medicos, this.medicosSort, valueGetter);
      return;
    }
    const q = this.searchMedicos.toLowerCase();
    const filtrados = this.medicos.filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.apellidoPaterno.toLowerCase().includes(q) ||
      m.especialidad.toLowerCase().includes(q)
    );
    this.medicosFiltrados = this._sortRows(filtrados, this.medicosSort, valueGetter);
  }

  toggleMedicosSort(key: string): void {
    this.medicosSort = this.medicosSort.key === key
      ? { key, direction: this.medicosSort.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' };
    this.filtrarMedicos();
  }

  getSortIndicator(sort: TableSortState, key: string): string {
    if (sort.key !== key) return '-';
    return sort.direction === 'asc' ? '^' : 'v';
  }

  abrirNuevoMedico(): void { this.showNuevoMedicoModal = true; }
  verDetalleMedico(medico: MedicoLocal): void { this.medicoParaDetalle = medico; }
  editarMedico(medico: MedicoLocal): void { this.medicoParaEditar = medico; }
  onMedicoGuardado(): void { this.showNuevoMedicoModal = false; this._cargarDoctores(); }
  onEdicionGuardada(): void { this.medicoParaEditar = null; this._cargarDoctores(); }

  toggleActivoMedico(medico: MedicoLocal): void {
    const previo = this._normalizeActivo(medico.activo);
    const nuevo: 'S' | 'N' = previo === 'S' ? 'N' : 'S';
    medico.activo = nuevo;

    if (nuevo === 'N') {
      this.api.deleteDoctor(medico.idDoctor).subscribe({
        next: () => {
          this._replaceMedicoInView({ ...medico, activo: 'N' });
          this.filtrarMedicos();
        },
        error: (err) => {
          medico.activo = previo;
          alert(err?.error?.detail || 'No se pudo cambiar el estado del médico.');
        },
      });
      return;
    }

    const payload = {
      nombre: medico.nombre,
      apellido_paterno: medico.apellidoPaterno,
      apellido_materno: medico.apellidoMaterno || '',
      especialidad: medico.especialidad,
      telefono: medico.telefono || '',
      correo: medico.correo || '',
      activo: nuevo,
      servicios: (medico.servicios || []).map((s: MedicoServicioLocal) => s.idServicio),
    };
    this.api.updateDoctor(medico.idDoctor, payload).subscribe({
      next: (response: unknown) => {
        const updated = response ? this._mapDoctorFromApi(response as Record<string, unknown>) : { ...medico, activo: nuevo };
        this._replaceMedicoInView(updated);
        this.filtrarMedicos();
      },
      error: (err) => {
        medico.activo = previo;
        alert(err?.error?.detail || 'No se pudo cambiar el estado del médico.');
      },
    });
  }

  abrirDisponibilidad(medico: MedicoLocal): void { this.medicoParaDisponibilidad = medico; }

  // ── Context menu ──

  toggleMedicoMenu(medico: MedicoLocal, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openMedicoMenu === medico.idDoctor) { this.closeMedicoMenu(); return; }
    this.medicoMenuTriggerElement = event.currentTarget as HTMLElement;
    this.menuMedicoPosition = this._getMenuPosition(this.medicoMenuTriggerElement.getBoundingClientRect(), this.medicoMenuEstimatedHeight);
    this.menuMedico = medico;
    this.openMedicoMenu = medico.idDoctor;
  }

  closeMedicoMenu(): void {
    this.openMedicoMenu = null;
    this.menuMedico = null;
    this.medicoMenuTriggerElement = null;
  }

  // ── Private helpers ──

  private _cargarDoctores(): void {
    this.api.getDoctores().subscribe({
      next: (data) => {
        this.medicos = data.map((d) => this._mapDoctorFromApi(d as unknown as Record<string, unknown>));
        this.filtrarMedicos();
      },
      error: (err) => console.error('Error al cargar médicos:', err),
    });
  }

  private _normalizeActivo(value: unknown): 'S' | 'N' {
    return String(value || '').trim().toUpperCase() === 'S' ? 'S' : 'N';
  }

  private _mapDoctorFromApi(d: Record<string, unknown>): MedicoLocal {
    const servicios = (d['servicios'] as Record<string, unknown>[] | undefined) || [];
    return {
      idDoctor: d['id_doctor'] as number,
      nombre: d['nombre'] as string,
      apellidoPaterno: d['apellido_paterno'] as string,
      apellidoMaterno: d['apellido_materno'] as string,
      especialidad: d['especialidad'] as string,
      telefono: d['telefono'] as string,
      correo: d['correo'] as string,
      activo: this._normalizeActivo(d['activo']),
      servicios: servicios.map((s: Record<string, unknown>) => ({ idServicio: s['id_servicio'] as number, nombre: s['nombre'] as string })),
      iniciales: (String(d['nombre'] || '').charAt(0)) + (String(d['apellido_paterno'] || '').charAt(0)),
    };
  }

  private _replaceMedicoInView(updated: MedicoLocal): void {
    this.medicos = this.medicos.map(m => m.idDoctor === updated.idDoctor ? updated : m);
    this.medicosFiltrados = this.medicosFiltrados.map(m => m.idDoctor === updated.idDoctor ? updated : m);
    if (this.medicoParaDetalle?.idDoctor === updated.idDoctor) this.medicoParaDetalle = updated;
    if (this.menuMedico?.idDoctor === updated.idDoctor) this.menuMedico = updated;
  }

  private _getMenuPosition(rect: DOMRect, estimatedHeight: number): { top: number; left: number } {
    const vp = this.actionMenuViewportPadding;
    const preferredTop = rect.bottom + this.actionMenuGap;
    const maxTop = Math.max(vp, window.innerHeight - estimatedHeight - vp);
    const top = Math.max(vp, Math.min(preferredTop, maxTop));
    const preferredLeft = rect.right - this.actionMenuWidth;
    const maxLeft = Math.max(vp, window.innerWidth - this.actionMenuWidth - vp);
    const left = Math.min(Math.max(vp, preferredLeft), maxLeft);
    return { top, left };
  }

  private _repositionMedicoMenu(): void {
    if (this.openMedicoMenu !== null && this.medicoMenuTriggerElement) {
      if (!document.body.contains(this.medicoMenuTriggerElement)) {
        this.closeMedicoMenu();
      } else {
        this.menuMedicoPosition = this._getMenuPosition(
          this.medicoMenuTriggerElement.getBoundingClientRect(), this.medicoMenuEstimatedHeight);
      }
    }
  }

  private _sortRows<T>(rows: T[], sort: TableSortState, valueGetter: (row: T, key: string) => unknown): T[] {
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = this._toComparable(valueGetter(a, sort.key));
      const right = this._toComparable(valueGetter(b, sort.key));
      if (left < right) return -1 * dir;
      if (left > right) return 1 * dir;
      return 0;
    });
  }

  private _toComparable(value: unknown): number | string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    const text = String(value).trim();
    const maybeDate = Date.parse(text);
    if (!Number.isNaN(maybeDate) && /\d{4}-\d{2}-\d{2}/.test(text)) return maybeDate;
    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text !== '') return maybeNumber;
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
