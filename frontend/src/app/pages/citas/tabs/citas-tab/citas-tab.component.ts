import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../services/api.service';

interface TableSortState { key: string; direction: 'asc' | 'desc'; }

@Component({
  selector: 'app-citas-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './citas-tab.component.html',
})
export class CitasTabComponent implements OnInit, OnDestroy {
  @Input() isAdmin = false;

  // Views & filters
  citasView: 'lista' | 'calendario' = 'lista';
  searchCitas = '';
  filtroEstado = 'Todas';
  filtroTipo = 'Todas';
  readonly todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' });
  filtroFecha = this.todayStr;
  readonly estadoFilters = ['Todas', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'];
  readonly tipoFilters = ['Todas', 'Consulta Neurocirugía', 'Consulta Ortopédica', 'Consulta Urológica', 'Fisioterapia', 'Terapia Ocupacional'];

  // Calendar
  calendarYear = new Date().getFullYear();
  calendarMonth = new Date().getMonth();

  // Data
  loading = true;
  citas: any[] = [];
  citasFiltradas: any[] = [];
  citasSort: TableSortState = { key: 'fechaHora', direction: 'asc' };
  serviciosList: any[] = [];
  medicos: any[] = [];

  // Pagination
  readonly citasPageSize = 20;
  citasPaginaActual = 1;

  // Modals
  showNuevaCitaModal = false;
  showDetalleCitaModal = false;
  showEditCitaModal = false;
  showConfirmDeleteCita = false;
  citaSeleccionada: any = null;
  citaAEliminar: any = null;

  // Nueva cita form
  beneficiariosList: any[] = [];
  beneficiariosFiltrados: any[] = [];
  busquedaPaciente = '';
  showPacienteDropdown = false;
  nuevaCita: any = { id_paciente: null, estatus: 'PROGRAMADA', notas: '', servicios: [] };
  nuevaCitaFechaHora = '';
  nuevaCitaIdDoctor: number | null = null;
  nuevaCitaServiciosFiltrados: any[] = [];
  nuevaCitaLoadingServicios = false;
  guardandoCita = false;

  // Edit cita
  editCita: any = null;
  editCitaFechaHora = '';
  guardandoEdicionCita = false;

  // Context menu
  openCitaMenu: number | null = null;
  menuCitaPosition = { top: 0, left: 0 };
  menuCita: any = null;
  private citaMenuTriggerElement: HTMLElement | null = null;
  private readonly actionMenuWidth = 192;
  private readonly citaMenuEstimatedHeight = 340;
  private readonly actionMenuGap = 6;
  private readonly actionMenuViewportPadding = 8;
  private readonly _onViewportChange = (): void => { this._repositionCitaMenu(); };

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this._cargarCitas();
    this.api.getServicios().subscribe({
      next: (data) => { this.serviciosList = data; this.nuevaCitaServiciosFiltrados = data; },
      error: (err) => console.error('Error al cargar servicios:', err),
    });
    this.api.getDoctores().subscribe({
      next: (data) => {
        this.medicos = data.map((d: any) => ({
          idDoctor: d.id_doctor,
          nombre: d.nombre,
          apellidoPaterno: d.apellido_paterno,
          especialidad: d.especialidad,
        }));
      },
      error: (err) => console.error('Error al cargar médicos:', err),
    });
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'nueva') {
        setTimeout(() => this.abrirNuevaCita(), 0);
      }
    });
    window.visualViewport?.addEventListener('resize', this._onViewportChange, { passive: true });
    window.visualViewport?.addEventListener('scroll', this._onViewportChange, { passive: true });
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this._onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this._onViewportChange);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this._repositionCitaMenu(); }

  // ── Calendar ──

  get calendarMonthLabel(): string {
    return new Date(this.calendarYear, this.calendarMonth, 1)
      .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): { dateStr: string; day: number; isCurrentMonth: boolean; isToday: boolean; citas: any[] }[] {
    const first = new Date(this.calendarYear, this.calendarMonth, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const todayStr = new Date().toLocaleDateString('en-CA');
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toLocaleDateString('en-CA');
      days.push({
        dateStr, day: d.getDate(),
        isCurrentMonth: d.getMonth() === this.calendarMonth,
        isToday: dateStr === todayStr,
        citas: this.citas.filter(c => (c.fechaHora || '').startsWith(dateStr)),
      });
    }
    return days;
  }

  calendarPrev(): void {
    if (this.calendarMonth === 0) { this.calendarYear--; this.calendarMonth = 11; }
    else this.calendarMonth--;
  }

  calendarNext(): void {
    if (this.calendarMonth === 11) { this.calendarYear++; this.calendarMonth = 0; }
    else this.calendarMonth++;
  }

  // ── Pagination ──

  get citasTotalPaginas(): number {
    return Math.max(1, Math.ceil(this.citasFiltradas.length / this.citasPageSize));
  }

  get citasPaginadas(): any[] {
    const start = (this.citasPaginaActual - 1) * this.citasPageSize;
    return this.citasFiltradas.slice(start, start + this.citasPageSize);
  }

  get citasPaginasVisibles(): (number | '...')[] {
    const total = this.citasTotalPaginas;
    const current = this.citasPaginaActual;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  get citasPaginaFin(): number {
    return Math.min(this.citasPaginaActual * this.citasPageSize, this.citasFiltradas.length);
  }

  irAPagina(pagina: number): void {
    this.citasPaginaActual = Math.max(1, Math.min(pagina, this.citasTotalPaginas));
  }

  // ── Filters ──

  filtrarCitas(): void {
    let resultado = [...this.citas];
    if (this.searchCitas) {
      const q = this.searchCitas.toLowerCase();
      resultado = resultado.filter(c => c.nombrePaciente.toLowerCase().includes(q));
    }
    if (this.filtroFecha) {
      resultado = resultado.filter(c => {
        if (!c.fechaHora) return false;
        return this._toMXDate(c.fechaHora).toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' }) === this.filtroFecha;
      });
    }
    if (this.filtroEstado !== 'Todas') resultado = resultado.filter(c => c.estatus === this.filtroEstado);
    if (this.filtroTipo !== 'Todas') resultado = resultado.filter(c => c.servicios.some((s: any) => s.nombre === this.filtroTipo));
    this.citasPaginaActual = 1;
    this.citasFiltradas = this._sortRows(resultado, this.citasSort, (cita, key) => {
      switch (key) {
        case 'fechaHora': return cita.fechaHora;
        case 'paciente': return cita.nombrePaciente;
        case 'tipoConsulta': return cita.servicios?.[0]?.nombre || '';
        case 'estado': return cita.estatus;
        default: return cita.fechaHora;
      }
    });
  }

  toggleCitasSort(key: string): void {
    this.citasSort = this.citasSort.key === key
      ? { key, direction: this.citasSort.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' };
    this.filtrarCitas();
  }

  getSortIndicator(sort: TableSortState, key: string): string {
    if (sort.key !== key) return '-';
    return sort.direction === 'asc' ? '^' : 'v';
  }

  // ── Date helpers ──

  private _toMXDate(fechaHora: string): Date {
    const clean = fechaHora.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(fechaHora)
      ? fechaHora : fechaHora + '-06:00';
    return new Date(clean);
  }

  getHora(fechaHora: string): string {
    if (!fechaHora) return '';
    return this._toMXDate(fechaHora)
      .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Monterrey' });
  }

  getFecha(fechaHora: string): string {
    if (!fechaHora) return '';
    return this._toMXDate(fechaHora)
      .toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Monterrey' });
  }

  formatFechaHora(fechaHora: string): string {
    if (!fechaHora) return '';
    return this._toMXDate(fechaHora)
      .toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Monterrey' });
  }

  getEstadoBadgeClass(estatus: string): string {
    switch (estatus) {
      case 'COMPLETADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'EN_CURSO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROGRAMADA': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'CANCELADA': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  // ── Nueva Cita ──

  abrirNuevaCita(): void {
    this.nuevaCita = { id_paciente: null, estatus: 'PROGRAMADA', notas: '', servicios: [] };
    this.nuevaCitaFechaHora = '';
    this.nuevaCitaIdDoctor = null;
    this.nuevaCitaServiciosFiltrados = this.serviciosList;
    this.busquedaPaciente = '';
    this.showPacienteDropdown = false;
    this.beneficiariosFiltrados = [];
    this.showNuevaCitaModal = true;
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiariosList = data.map((b: any) => ({
          id_paciente: b.id_paciente,
          folio: b.folio,
          nombre_completo: `${b.nombre || ''} ${b.apellido_paterno || ''} ${b.apellido_materno || ''}`.trim(),
        }));
      },
      error: (err) => console.error('Error al cargar beneficiarios:', err),
    });
  }

  filtrarBeneficiarios(): void {
    this.showPacienteDropdown = true;
    if (!this.busquedaPaciente) {
      this.beneficiariosFiltrados = [];
      this.nuevaCita.id_paciente = null;
      return;
    }
    const term = this.busquedaPaciente.toLowerCase();
    this.beneficiariosFiltrados = this.beneficiariosList
      .filter(b => b.folio?.toLowerCase().includes(term) || b.nombre_completo.toLowerCase().includes(term))
      .slice(0, 10);
  }

  seleccionarPaciente(b: any): void {
    this.nuevaCita.id_paciente = b.id_paciente;
    this.busquedaPaciente = `${b.folio} - ${b.nombre_completo}`;
    this.showPacienteDropdown = false;
    this.beneficiariosFiltrados = [];
  }

  agregarServicioCita(): void {
    this.nuevaCita.servicios.push({ id_servicio: null, cantidad: 1, monto_pagado: 0 });
  }

  quitarServicioCita(index: number): void { this.nuevaCita.servicios.splice(index, 1); }

  onDoctorNuevaCitaChange(): void {
    this.nuevaCita.servicios.forEach((s: any) => { s.id_servicio = null; s.monto_pagado = 0; });
    if (!this.nuevaCitaIdDoctor) { this.nuevaCitaServiciosFiltrados = this.serviciosList; return; }
    this.nuevaCitaLoadingServicios = true;
    this.api.getDoctorServicios(this.nuevaCitaIdDoctor).subscribe({
      next: (doctorServs: any[]) => {
        const ids = new Set(doctorServs.map((s: any) => s.id_servicio));
        this.nuevaCitaServiciosFiltrados = this.serviciosList.filter(s => ids.has(s.id_servicio));
        this.nuevaCitaLoadingServicios = false;
      },
      error: () => { this.nuevaCitaServiciosFiltrados = this.serviciosList; this.nuevaCitaLoadingServicios = false; },
    });
  }

  onServicioNuevaCitaChange(srv: any): void {
    if (!srv.id_servicio) { srv.monto_pagado = 0; return; }
    const found = this.serviciosList.find((s: any) => s.id_servicio === srv.id_servicio);
    if (found) srv.monto_pagado = found.cuota_recuperacion ?? found.precio_cuota_a ?? 0;
  }

  guardarCita(): void {
    if (!this.nuevaCita.id_paciente || !this.nuevaCitaFechaHora) return;
    this.guardandoCita = true;
    const payload = {
      id_paciente: this.nuevaCita.id_paciente,
      fecha_hora: this.nuevaCitaFechaHora.length === 16 ? this.nuevaCitaFechaHora + ':00' : this.nuevaCitaFechaHora,
      estatus: this.nuevaCita.estatus,
      notas: this.nuevaCita.notas,
      servicios: this.nuevaCita.servicios
        .filter((s: any) => s.id_servicio !== null)
        .map((s: any) => ({ id_servicio: s.id_servicio, id_doctor: this.nuevaCitaIdDoctor ?? null, cantidad: s.cantidad, monto_pagado: s.monto_pagado })),
    };
    this.api.createCita(payload).subscribe({
      next: () => { this.showNuevaCitaModal = false; this.guardandoCita = false; this._cargarCitas(); },
      error: (err) => { console.error('Error al crear cita:', err); this.guardandoCita = false; },
    });
  }

  // ── Detalle Cita ──

  verDetalleCita(cita: any): void {
    this.citaSeleccionada = cita;
    this.showDetalleCitaModal = true;
  }

  // ── Editar Cita ──

  editarCita(cita: any): void {
    this.editCita = {
      idCita: cita.idCita, idPaciente: cita.idPaciente, nombrePaciente: cita.nombrePaciente,
      estatus: cita.estatus, notas: cita.notas || '', servicios: cita.servicios.map((s: any) => ({ ...s })),
    };
    this.editCitaFechaHora = cita.fechaHora ? cita.fechaHora.substring(0, 16) : '';
    this.showEditCitaModal = true;
  }

  agregarServicioEditCita(): void {
    this.editCita.servicios.push({ idServicio: null, cantidad: 1, montoPagado: 0 });
  }

  guardarEdicionCita(): void {
    if (!this.editCitaFechaHora) return;
    this.guardandoEdicionCita = true;
    const payload = {
      id_paciente: this.editCita.idPaciente,
      fecha_hora: this.editCitaFechaHora.length === 16 ? this.editCitaFechaHora + ':00' : this.editCitaFechaHora,
      estatus: this.editCita.estatus, notas: this.editCita.notas,
      servicios: this.editCita.servicios.filter((s: any) => s.idServicio !== null)
        .map((s: any) => ({ id_servicio: s.idServicio, cantidad: s.cantidad, monto_pagado: s.montoPagado })),
    };
    this.api.updateCita(this.editCita.idCita, payload).subscribe({
      next: () => { this.showEditCitaModal = false; this.guardandoEdicionCita = false; this._cargarCitas(); },
      error: (err) => { console.error('Error al actualizar cita:', err); this.guardandoEdicionCita = false; },
    });
  }

  completarCitaInline(cita: any): void {
    this.api.completarCita(cita.idCita).subscribe({ next: () => this._cargarCitas(), error: (err) => console.error(err) });
  }

  cancelarCitaInline(cita: any): void {
    this.api.cancelarCita(cita.idCita).subscribe({ next: () => this._cargarCitas(), error: (err) => console.error(err) });
  }

  descargarComprobante(cita: any): void {
    this.api.exportarComprobanteCitaPdf(cita.idCita).subscribe({
      next: (blob) => this._abrirPdfEnNuevaTab(blob),
      error: () => alert('Error al generar comprobante'),
    });
  }

  exportarCitasCSV(): void {
    const rows = [
      ['Fecha', 'Hora', 'Paciente', 'Tipo de consulta', 'Estado', 'Notas'],
      ...this.citasFiltradas.map(c => [
        this.getFecha(c.fechaHora), this.getHora(c.fechaHora), c.nombrePaciente,
        c.servicios?.[0]?.nombre || '', c.estatus, (c.notas || '').replace(/\n/g, ' '),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citas_${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  confirmarEliminarCita(cita: any): void {
    this.citaAEliminar = cita;
    this.showConfirmDeleteCita = true;
  }

  eliminarCita(): void {
    if (!this.citaAEliminar) return;
    this.api.deleteCita(this.citaAEliminar.idCita).subscribe({
      next: () => { this.showConfirmDeleteCita = false; this.citaAEliminar = null; this._cargarCitas(); },
      error: (err) => { console.error('Error al eliminar cita:', err); this.showConfirmDeleteCita = false; },
    });
  }

  // ── Context menu ──

  toggleCitaMenu(cita: any, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openCitaMenu === cita.idCita) { this.closeCitaMenu(); return; }
    this.citaMenuTriggerElement = event.currentTarget as HTMLElement;
    this.menuCitaPosition = this._getMenuPosition(this.citaMenuTriggerElement.getBoundingClientRect(), this.citaMenuEstimatedHeight);
    this.menuCita = cita;
    this.openCitaMenu = cita.idCita;
  }

  closeCitaMenu(): void {
    this.openCitaMenu = null;
    this.menuCita = null;
    this.citaMenuTriggerElement = null;
  }

  // ── Private helpers ──

  private _cargarCitas(): void {
    this.loading = true;
    this.api.getCitas().subscribe({
      next: (data) => {
        this.citas = data.map((c: any) => ({
          idCita: c.id_cita, idPaciente: c.id_paciente, nombrePaciente: c.nombre_paciente,
          folioPaciente: c.folio_paciente, fechaHora: c.fecha_hora, estatus: c.estatus, notas: c.notas,
          servicios: (c.servicios || []).map((s: any) => ({ idServicio: s.id_servicio, nombre: s.nombre, cantidad: s.cantidad, montoPagado: s.monto_pagado })),
        }));
        this.filtrarCitas();
        this.loading = false;
      },
      error: (err) => { console.error('Error al cargar citas:', err); this.loading = false; },
    });
  }

  private _abrirPdfEnNuevaTab(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

  private _repositionCitaMenu(): void {
    if (this.openCitaMenu !== null && this.citaMenuTriggerElement) {
      if (!document.body.contains(this.citaMenuTriggerElement)) {
        this.closeCitaMenu();
      } else {
        this.menuCitaPosition = this._getMenuPosition(
          this.citaMenuTriggerElement.getBoundingClientRect(), this.citaMenuEstimatedHeight);
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
