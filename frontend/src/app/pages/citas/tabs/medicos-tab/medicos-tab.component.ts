import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';

interface TableSortState { key: string; direction: 'asc' | 'desc'; }

@Component({
  selector: 'app-medicos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medicos-tab.component.html',
})
export class MedicosTabComponent implements OnInit, OnDestroy {
  searchMedicos = '';
  medicos: any[] = [];
  medicosFiltrados: any[] = [];
  serviciosList: any[] = [];
  medicosSort: TableSortState = { key: 'nombre', direction: 'asc' };

  // Modals
  showNuevoMedicoModal = false;
  showDetalleMedicoModal = false;
  showEditMedicoModal = false;
  showDisponibilidadModal = false;
  medicoSeleccionado: any = null;

  // Nuevo medico form
  nuevoMedico: any = { nombre: '', apellido_paterno: '', apellido_materno: '', especialidad: '', telefono: '', correo: '', activo: 'S' };
  medicoServiciosSeleccionados: number[] = [];
  guardandoMedico = false;
  nuevoMedicoError = '';

  // Edit medico
  editMedico: any = null;
  editMedicoServiciosSeleccionados: number[] = [];
  guardandoEdicionMedico = false;
  editMedicoError = '';

  // Disponibilidad
  disponibilidadDoctor: any = null;
  disponibilidadSlots: any[] = [];
  disponibilidadSemana: any[] = [];
  disponibilidadError = '';
  nuevoSlot: any = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
  guardandoSlot = false;

  // Disponibilidad especial
  disponibilidadEspecial: any[] = [];
  guardandoDispEspecial = false;
  dispEspecialError = '';
  nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };

  readonly horasDisponibles: string[] = (() => {
    const slots: string[] = [];
    for (let h = 7; h <= 21; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 21) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  })();

  readonly diasSemana = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miercoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sabado' },
    { num: 7, nombre: 'Domingo' },
  ];

  // Context menu
  openMedicoMenu: number | null = null;
  menuMedicoPosition = { top: 0, left: 0 };
  menuMedico: any = null;
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
    const valueGetter = (medico: any, key: string): unknown => {
      switch (key) {
        case 'nombre': return `${medico.nombre} ${medico.apellidoPaterno} ${medico.apellidoMaterno || ''}`;
        case 'especialidad': return medico.especialidad;
        case 'contacto': return `${medico.telefono || ''} ${medico.correo || ''}`;
        case 'servicios': return (medico.servicios || []).map((s: any) => s.nombre).join(', ');
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

  // ── Nuevo Medico ──

  abrirNuevoMedico(): void {
    this.nuevoMedico = { nombre: '', apellido_paterno: '', apellido_materno: '', especialidad: '', telefono: '', correo: '', activo: 'S' };
    this.medicoServiciosSeleccionados = [];
    this.nuevoMedicoError = '';
    this.showNuevoMedicoModal = true;
  }

  toggleServicioMedico(idServicio: number): void {
    const idx = this.medicoServiciosSeleccionados.indexOf(idServicio);
    if (idx >= 0) this.medicoServiciosSeleccionados.splice(idx, 1);
    else this.medicoServiciosSeleccionados.push(idServicio);
  }

  guardarMedico(): void {
    if (!this.nuevoMedico.nombre || !this.nuevoMedico.apellido_paterno) return;
    this.guardandoMedico = true;
    const payload = {
      nombre: this.nuevoMedico.nombre,
      apellido_paterno: this.nuevoMedico.apellido_paterno,
      apellido_materno: this.nuevoMedico.apellido_materno,
      especialidad: this.nuevoMedico.especialidad,
      telefono: this.nuevoMedico.telefono,
      correo: this.nuevoMedico.correo,
      activo: this.nuevoMedico.activo,
      servicios: [...this.medicoServiciosSeleccionados],
    };
    this.api.createDoctor(payload).subscribe({
      next: () => {
        this.showNuevoMedicoModal = false;
        this.guardandoMedico = false;
        this.nuevoMedicoError = '';
        this._cargarDoctores();
      },
      error: (err) => {
        this.guardandoMedico = false;
        this.nuevoMedicoError = err?.error?.detail || 'Error al guardar el médico. Intenta de nuevo.';
      },
    });
  }

  // ── Detalle Medico ──

  verDetalleMedico(medico: any): void {
    this.medicoSeleccionado = medico;
    this.showDetalleMedicoModal = true;
  }

  // ── Editar Medico ──

  editarMedico(medico: any): void {
    this.editMedico = {
      idDoctor: medico.idDoctor,
      nombre: medico.nombre,
      apellido_paterno: medico.apellidoPaterno,
      apellido_materno: medico.apellidoMaterno || '',
      especialidad: medico.especialidad,
      telefono: medico.telefono || '',
      correo: medico.correo || '',
      activo: medico.activo,
    };
    this.editMedicoServiciosSeleccionados = medico.servicios.map((s: any) => s.idServicio);
    this.editMedicoError = '';
    this.showEditMedicoModal = true;
  }

  toggleEditServicioMedico(idServicio: number): void {
    const idx = this.editMedicoServiciosSeleccionados.indexOf(idServicio);
    if (idx >= 0) this.editMedicoServiciosSeleccionados.splice(idx, 1);
    else this.editMedicoServiciosSeleccionados.push(idServicio);
  }

  guardarEdicionMedico(): void {
    if (!this.editMedico.nombre || !this.editMedico.apellido_paterno) return;
    this.guardandoEdicionMedico = true;
    const payload = {
      nombre: this.editMedico.nombre,
      apellido_paterno: this.editMedico.apellido_paterno,
      apellido_materno: this.editMedico.apellido_materno,
      especialidad: this.editMedico.especialidad,
      telefono: this.editMedico.telefono,
      correo: this.editMedico.correo,
      activo: this.editMedico.activo,
      servicios: [...this.editMedicoServiciosSeleccionados],
    };
    this.api.updateDoctor(this.editMedico.idDoctor, payload).subscribe({
      next: () => {
        this.showEditMedicoModal = false;
        this.guardandoEdicionMedico = false;
        this.editMedicoError = '';
        this._cargarDoctores();
      },
      error: (err) => {
        this.guardandoEdicionMedico = false;
        this.editMedicoError = err?.error?.detail || 'Error al actualizar el médico.';
      },
    });
  }

  toggleActivoMedico(medico: any): void {
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
      servicios: (medico.servicios || []).map((s: any) => s.idServicio),
    };
    this.api.updateDoctor(medico.idDoctor, payload).subscribe({
      next: (response: any) => {
        const updated = response ? this._mapDoctorFromApi(response) : { ...medico, activo: nuevo };
        this._replaceMedicoInView(updated);
        this.filtrarMedicos();
      },
      error: (err) => {
        medico.activo = previo;
        alert(err?.error?.detail || 'No se pudo cambiar el estado del médico.');
      },
    });
  }

  // ── Disponibilidad ──

  abrirDisponibilidad(medico: any): void {
    this.disponibilidadDoctor = medico;
    this.disponibilidadSlots = [];
    this.disponibilidadEspecial = [];
    this.disponibilidadError = '';
    this.dispEspecialError = '';
    this.nuevoSlot = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
    this.nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };
    this.showDisponibilidadModal = true;
    this._cargarDisponibilidad(medico.idDoctor);
    this._cargarDisponibilidadEspecial(medico.idDoctor);
    this.api.getDisponibilidadSemana().subscribe({
      next: (data) => { this.disponibilidadSemana = data; },
      error: () => { this.disponibilidadSemana = []; },
    });
  }

  getSlotsForDay(dia: number): any[] {
    return this.disponibilidadSlots.filter(s => s.dia_semana === dia);
  }

  getConflictDoctor(dia: number, slot: any): string | null {
    const conflict = this.disponibilidadSemana.find(s =>
      s.dia_semana === dia &&
      s.id_doctor !== this.disponibilidadDoctor?.idDoctor &&
      s.hora_inicio < slot.hora_fin &&
      s.hora_fin > slot.hora_inicio
    );
    return conflict ? conflict.nombre_doctor : null;
  }

  agregarSlotDisponibilidad(): void {
    if (!this.nuevoSlot.dia_semana || !this.nuevoSlot.hora_inicio || !this.nuevoSlot.hora_fin) return;
    this.disponibilidadError = '';
    if (this.nuevoSlot.hora_inicio >= this.nuevoSlot.hora_fin) {
      this.disponibilidadError = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }
    this.guardandoSlot = true;
    this.api.createDoctorDisponibilidad(this.disponibilidadDoctor.idDoctor, {
      dia_semana: this.nuevoSlot.dia_semana,
      hora_inicio: this.nuevoSlot.hora_inicio,
      hora_fin: this.nuevoSlot.hora_fin,
    }).subscribe({
      next: () => {
        this.guardandoSlot = false;
        this.nuevoSlot = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
        this._cargarDisponibilidad(this.disponibilidadDoctor.idDoctor);
        this.api.getDisponibilidadSemana().subscribe({ next: (data) => { this.disponibilidadSemana = data; } });
      },
      error: (err) => {
        this.guardandoSlot = false;
        this.disponibilidadError = err.error?.detail || 'Error al crear disponibilidad';
      },
    });
  }

  eliminarSlotDisponibilidad(slot: any): void {
    if (!this.disponibilidadDoctor) return;
    this.api.deleteDoctorDisponibilidad(this.disponibilidadDoctor.idDoctor, slot.id_disponibilidad).subscribe({
      next: () => {
        this._cargarDisponibilidad(this.disponibilidadDoctor.idDoctor);
        this.api.getDisponibilidadSemana().subscribe({ next: (data) => { this.disponibilidadSemana = data; } });
      },
      error: (err) => console.error('Error al eliminar disponibilidad:', err),
    });
  }

  agregarDispEspecial(): void {
    if (!this.nuevoDispEspecial.fecha_inicio || !this.nuevoDispEspecial.hora_inicio || !this.nuevoDispEspecial.hora_fin) return;
    this.dispEspecialError = '';
    if (this.nuevoDispEspecial.hora_inicio >= this.nuevoDispEspecial.hora_fin) {
      this.dispEspecialError = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }
    this.guardandoDispEspecial = true;
    this.api.createDoctorDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor, {
      fecha_inicio: this.nuevoDispEspecial.fecha_inicio,
      hora_inicio: this.nuevoDispEspecial.hora_inicio,
      hora_fin: this.nuevoDispEspecial.hora_fin,
      tipo_recurrencia: this.nuevoDispEspecial.tipo_recurrencia,
      descripcion: this.nuevoDispEspecial.descripcion || null,
    }).subscribe({
      next: () => {
        this.guardandoDispEspecial = false;
        this.nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };
        this._cargarDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor);
      },
      error: (err) => {
        this.guardandoDispEspecial = false;
        this.dispEspecialError = err?.error?.detail || 'Error al guardar la disponibilidad especial.';
      },
    });
  }

  eliminarDispEspecial(de: any): void {
    if (!this.disponibilidadDoctor) return;
    this.api.deleteDoctorDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor, de.id_disp_especial).subscribe({
      next: () => { this._cargarDisponibilidadEspecial(this.disponibilidadDoctor.idDoctor); },
      error: (err) => console.error('Error al eliminar disponibilidad especial:', err),
    });
  }

  tipoRecurrenciaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'UNICA': 'Única vez',
      'QUINCENAL': 'Quincenal',
      'CADA_3_SEMANAS': 'Cada 3 sem.',
      'MENSUAL': 'Mensual',
    };
    return labels[tipo] || tipo;
  }

  // ── Context menu ──

  toggleMedicoMenu(medico: any, event: MouseEvent): void {
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
        this.medicos = data.map((d: any) => this._mapDoctorFromApi(d));
        this.filtrarMedicos();
      },
      error: (err) => console.error('Error al cargar médicos:', err),
    });
  }

  private _cargarDisponibilidad(idDoctor: number): void {
    this.api.getDoctorDisponibilidad(idDoctor).subscribe({
      next: (data) => { this.disponibilidadSlots = data; },
      error: (err) => console.error('Error al cargar disponibilidad:', err),
    });
  }

  private _cargarDisponibilidadEspecial(idDoctor: number): void {
    this.api.getDoctorDisponibilidadEspecial(idDoctor).subscribe({
      next: (data) => { this.disponibilidadEspecial = data; },
      error: (err) => console.error('Error al cargar disponibilidad especial:', err),
    });
  }

  private _normalizeActivo(value: unknown): 'S' | 'N' {
    return String(value || '').trim().toUpperCase() === 'S' ? 'S' : 'N';
  }

  private _mapDoctorFromApi(d: any): any {
    return {
      idDoctor: d.id_doctor,
      nombre: d.nombre,
      apellidoPaterno: d.apellido_paterno,
      apellidoMaterno: d.apellido_materno,
      especialidad: d.especialidad,
      telefono: d.telefono,
      correo: d.correo,
      activo: this._normalizeActivo(d.activo),
      servicios: (d.servicios || []).map((s: any) => ({ idServicio: s.id_servicio, nombre: s.nombre })),
      iniciales: (d.nombre?.charAt(0) || '') + (d.apellido_paterno?.charAt(0) || ''),
    };
  }

  private _replaceMedicoInView(updated: any): void {
    this.medicos = this.medicos.map(m => m.idDoctor === updated.idDoctor ? updated : m);
    this.medicosFiltrados = this.medicosFiltrados.map(m => m.idDoctor === updated.idDoctor ? updated : m);
    if (this.medicoSeleccionado?.idDoctor === updated.idDoctor) this.medicoSeleccionado = updated;
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
