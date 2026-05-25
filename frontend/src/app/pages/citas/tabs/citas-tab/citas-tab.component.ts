import { Component, DestroyRef, HostListener, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../services/api.service';
import { ServicioRaw } from '../../../../shared/models/almacen.models';
import { TIMEZONE_MX, ACTION_NUEVO, PDF_REVOKE_DELAY_MS } from '../../../../shared/constants/app.constants';
import { NuevaCitaModalComponent } from './modals/nueva-cita-modal.component';
import { DetalleCitaModalComponent } from './modals/detalle-cita-modal.component';
import { EditarCitaModalComponent } from './modals/editar-cita-modal.component';
import { ConfirmarEliminarCitaModalComponent } from './modals/confirmar-eliminar-cita-modal.component';
import { KeyboardClickDirective } from '../../../../shared/directives/keyboard-click.directive';

interface TableSortState { key: string; direction: 'asc' | 'desc'; }
interface MedicoLocal { idDoctor: number; nombre: string; apellidoPaterno: string; especialidad?: string; }

interface CitaServicioLocal { idServicio: number; nombre: string; cantidad: number; montoPagado: number; }
interface CitaLocal {
  idCita: number;
  idPaciente: number;
  nombrePaciente: string;
  folioPaciente: string;
  fechaHora: string;
  estatus: string;
  notas: string | null;
  servicios: CitaServicioLocal[];
}

@Component({
  selector: 'app-citas-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NuevaCitaModalComponent, DetalleCitaModalComponent, EditarCitaModalComponent, ConfirmarEliminarCitaModalComponent, KeyboardClickDirective],
  templateUrl: './citas-tab.component.html',
})
export class CitasTabComponent implements OnInit, OnDestroy {
  @Input() isAdmin = false;

  // Views & filters
  citasView: 'lista' | 'calendario' = 'lista';
  searchCitas = '';
  filtroEstado = 'Todas';
  filtroTipo = 'Todas';
  readonly todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE_MX });
  filtroFecha = this.todayStr;
  readonly estadoFilters = ['Todas', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'];
  readonly tipoFilters = ['Todas', 'Consulta Neurocirugía', 'Consulta Ortopédica', 'Consulta Urológica', 'Fisioterapia', 'Terapia Ocupacional'];

  // Calendar
  calendarYear = new Date().getFullYear();
  calendarMonth = new Date().getMonth();

  // Data
  loading = true;
  citas: CitaLocal[] = [];
  citasFiltradas: CitaLocal[] = [];
  citasSort: TableSortState = { key: 'fechaHora', direction: 'asc' };
  serviciosList: ServicioRaw[] = [];
  medicos: MedicoLocal[] = [];

  // Pagination
  readonly citasPageSize = 20;
  citasPaginaActual = 1;

  // Modals
  showNuevaCitaModal = false;
  citaParaDetalle: CitaLocal | null = null;
  citaParaEditar: CitaLocal | null = null;
  citaParaEliminar: CitaLocal | null = null;

  // Context menu
  openCitaMenu: number | null = null;
  menuCitaPosition = { top: 0, left: 0 };
  menuCita: CitaLocal | null = null;
  private citaMenuTriggerElement: HTMLElement | null = null;
  private readonly actionMenuWidth = 192;
  private readonly citaMenuEstimatedHeight = 340;
  private readonly actionMenuGap = 6;
  private readonly actionMenuViewportPadding = 8;
  private readonly _onViewportChange = (): void => { this._repositionCitaMenu(); };

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService, private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this._cargarCitas();
    this.api.getServicios().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => { this.serviciosList = data; },
      error: (err) => console.error('Error al cargar servicios:', err),
    });
    this.api.getDoctores().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.medicos = data.map((d) => ({
          idDoctor: d.id_doctor, nombre: d.nombre,
          apellidoPaterno: d.apellido_paterno, especialidad: d.especialidad,
        }));
      },
      error: (err) => console.error('Error al cargar médicos:', err),
    });
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        if (params['action'] === ACTION_NUEVO) {
          setTimeout(() => { this.showNuevaCitaModal = true; }, 0);
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

  get calendarDays(): { dateStr: string; day: number; isCurrentMonth: boolean; isToday: boolean; citas: CitaLocal[] }[] {
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

  get citasPaginadas(): CitaLocal[] {
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
        return this._toMXDate(c.fechaHora).toLocaleDateString('en-CA', { timeZone: TIMEZONE_MX }) === this.filtroFecha;
      });
    }
    if (this.filtroEstado !== 'Todas') resultado = resultado.filter(c => c.estatus === this.filtroEstado);
    if (this.filtroTipo !== 'Todas') resultado = resultado.filter(c => c.servicios.some((s: CitaServicioLocal) => s.nombre === this.filtroTipo));
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

  // ── Date helpers (used in table and CSV export) ──

  private _toMXDate(fechaHora: string): Date {
    const clean = fechaHora.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(fechaHora)
      ? fechaHora : fechaHora + '-06:00';
    return new Date(clean);
  }

  getHora(fechaHora: string): string {
    if (!fechaHora) return '';
    return this._toMXDate(fechaHora)
      .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIMEZONE_MX });
  }

  getFecha(fechaHora: string): string {
    if (!fechaHora) return '';
    return this._toMXDate(fechaHora)
      .toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: TIMEZONE_MX });
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

  // ── Modal handlers ──

  abrirNuevaCita(): void { this.showNuevaCitaModal = true; }
  verDetalleCita(cita: CitaLocal): void { this.citaParaDetalle = cita; }
  editarCita(cita: CitaLocal): void { this.citaParaEditar = cita; }
  confirmarEliminarCita(cita: CitaLocal): void { this.citaParaEliminar = cita; }
  onNuevaCitaGuardada(): void { this.showNuevaCitaModal = false; this._cargarCitas(); }
  onEdicionGuardada(): void { this.citaParaEditar = null; this._cargarCitas(); }
  onCitaEliminada(): void { this.citaParaEliminar = null; this._cargarCitas(); }

  // ── Inline actions ──

  completarCitaInline(cita: CitaLocal): void {
    this.api.completarCita(cita.idCita)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this._cargarCitas(), error: (err) => console.error(err) });
  }

  cancelarCitaInline(cita: CitaLocal): void {
    this.api.cancelarCita(cita.idCita)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this._cargarCitas(), error: (err) => console.error(err) });
  }

  descargarComprobante(cita: CitaLocal): void {
    this.api.exportarComprobanteCitaPdf(cita.idCita)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => this._abrirPdfEnNuevaTab(blob),
        error: () => alert('Error al generar comprobante'),
      });
  }

  exportarCitasCSV(): void {
    const rows = [
      ['Fecha', 'Hora', 'Paciente', 'Tipo de consulta', 'Estado', 'Notas'],
      ...this.citasFiltradas.map(c => [
        this.getFecha(c.fechaHora), this.getHora(c.fechaHora), c.nombrePaciente,
        c.servicios?.[0]?.nombre || '', c.estatus, (c.notas || '').replaceAll('\n', ' '),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citas_${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Context menu ──

  toggleCitaMenu(cita: CitaLocal, event: MouseEvent): void {
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
    this.api.getCitas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.citas = data.map((c) => ({
          idCita: c.id_cita, idPaciente: c.id_paciente ?? 0, nombrePaciente: c.nombre_paciente ?? '',
          folioPaciente: c.folio_paciente ?? '', fechaHora: c.fecha_hora, estatus: c.estatus, notas: c.notas ?? null,
          servicios: (c.servicios || []).map((s) => ({ idServicio: s.id_servicio, nombre: s.nombre, cantidad: s.cantidad ?? 1, montoPagado: s.monto_pagado ?? 0 })),
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
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), PDF_REVOKE_DELAY_MS);
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
      if (document.body.contains(this.citaMenuTriggerElement)) {
        this.menuCitaPosition = this._getMenuPosition(
          this.citaMenuTriggerElement.getBoundingClientRect(), this.citaMenuEstimatedHeight);
      } else {
        this.closeCitaMenu();
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
    const text = String(value).trim(); // NOSONAR
    const maybeDate = Date.parse(text);
    if (!Number.isNaN(maybeDate) && /\d{4}-\d{2}-\d{2}/.test(text)) return maybeDate;
    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text !== '') return maybeNumber;
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
