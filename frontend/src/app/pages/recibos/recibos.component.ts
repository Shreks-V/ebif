import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { NuevoCobroComponent } from './nuevo-cobro/nuevo-cobro.component';
import { DetalleReciboModalComponent } from './modals/detalle-recibo-modal.component';
import { CancelarReciboModalComponent } from './modals/cancelar-recibo-modal.component';
import { PagoReciboModalComponent } from './modals/pago-recibo-modal.component';
import { Recibo as ReciboAPI, MetodoPagoReciboItem } from '../../shared/models/recibo.models';

interface MetodoPagoItem {
  idMetodoPago: number;
  nombre: string;
  monto: number;
}

interface Recibo {
  idVenta: number;
  folioVenta: string;
  idPaciente: number;
  nombrePaciente: string;
  folioPaciente: string;
  fechaVenta: string;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  exentoPago: string;
  cancelada: string;
  motivoCancelacion: string | null;
  metodosPago: MetodoPagoItem[];
}

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-recibos',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent, NuevoCobroComponent, DetalleReciboModalComponent, CancelarReciboModalComponent, PagoReciboModalComponent],
  templateUrl: './recibos.component.html',
  styles: []
})
export class RecibosComponent implements OnInit {
  filtroFolio = '';
  filtroBeneficiario = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  filtroSoloAdeudos = false;

  loading = true;
  recibos: Recibo[] = [];
  recibosFiltrados: Recibo[] = [];
  recibosSort: TableSortState = { key: 'fechaVenta', direction: 'desc' };

  montoTotal = 0;
  montoEfectivo = 0;
  montoTarjeta = 0;
  montoTransferencia = 0;

  reciboParaDetalle: Recibo | null = null;
  reciboParaCancelar: Recibo | null = null;
  reciboParaPago: Recibo | null = null;

  showNuevoCobro = false;

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  constructor(private api: ApiService, private route: ActivatedRoute, private auth: AuthService) {}

  ngOnInit(): void {
    this.cargarRecibos();
    this.cargarStats();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'nuevo') {
        setTimeout(() => this.openNuevoCobro(), 0);
      }
      if (params['filter'] === 'pendientes') {
        this.filtroSoloAdeudos = true;
        this.filtrarRecibos();
      }
    });
  }

  // ── Data loading ──

  private cargarRecibos(): void {
    this.loading = true;
    this.api.getRecibos().subscribe({
      next: (data) => {
        this.recibos = data.map((r) => this._mapearRecibo(r));
        this.filtrarRecibos();
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar recibos:', err);
        this.loading = false;
      }
    });
  }

  private cargarStats(): void {
    this.api.getRecibosStats().subscribe({
      next: (stats) => {
        this.montoTotal = stats.monto_total_sum ?? 0;
        this.montoEfectivo = stats.monto_efectivo ?? 0;
        this.montoTarjeta = stats.monto_tarjeta ?? 0;
        this.montoTransferencia = stats.monto_transferencia ?? 0;
      },
      error: (err) => console.error('Error al cargar estadísticas de recibos:', err)
    });
  }

  // ── Filters & sorting ──

  filtrarRecibos(): void {
    const filtrados = this.recibos.filter(r => {
      const matchFolio = !this.filtroFolio || r.folioVenta.toLowerCase().includes(this.filtroFolio.toLowerCase());
      const matchBeneficiario = !this.filtroBeneficiario || r.nombrePaciente.toLowerCase().includes(this.filtroBeneficiario.toLowerCase());
      const matchFechaInicio = !this.filtroFechaInicio || !r.fechaVenta || r.fechaVenta.slice(0, 10) >= this.filtroFechaInicio;
      const matchFechaFin = !this.filtroFechaFin || !r.fechaVenta || r.fechaVenta.slice(0, 10) <= this.filtroFechaFin;
      const matchAdeudo = !this.filtroSoloAdeudos || (r.saldoPendiente > 0 && r.cancelada !== 'S');
      return matchFolio && matchBeneficiario && matchFechaInicio && matchFechaFin && matchAdeudo;
    });
    this.recibosFiltrados = this._sortRows(filtrados, this.recibosSort, (recibo, key) => this._getReciboSortValue(recibo, key));
  }

  limpiarFiltros(): void {
    this.filtroFolio = '';
    this.filtroBeneficiario = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroSoloAdeudos = false;
    this.filtrarRecibos();
  }

  toggleRecibosSort(key: string): void {
    if (this.recibosSort.key === key) {
      this.recibosSort.direction = this.recibosSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.recibosSort = { key, direction: 'asc' };
    }
    this.filtrarRecibos();
  }

  getSortIndicator(sort: TableSortState, key: string): string {
    if (sort.key !== key) return '-';
    return sort.direction === 'asc' ? '^' : 'v';
  }

  calcularEstadisticas(): void {
    const activos = this.recibos.filter(r => r.cancelada !== 'S');
    this.montoTotal = activos.reduce((sum, r) => sum + r.montoTotal, 0);
    this.montoEfectivo = activos.reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'EFECTIVO').reduce((s, mp) => s + mp.monto, 0), 0);
    this.montoTarjeta = activos.reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'TARJETA').reduce((s, mp) => s + mp.monto, 0), 0);
    this.montoTransferencia = activos.reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'TRANSFERENCIA').reduce((s, mp) => s + mp.monto, 0), 0);
  }

  // ── Nuevo cobro ──

  openNuevoCobro(): void { this.showNuevoCobro = true; }

  onCobroSaved(): void {
    this.cargarRecibos();
    this.cargarStats();
  }

  // ── Detalle modal ──

  verDetalle(recibo: Recibo): void { this.reciboParaDetalle = recibo; }

  abrirPagoDesdeDetalle(): void {
    if (this.reciboParaDetalle) this.reciboParaPago = this.reciboParaDetalle;
  }

  // ── Cancel modal ──

  confirmarCancelarRecibo(recibo: Recibo): void { this.reciboParaCancelar = recibo; }

  onCancelado(): void {
    this.reciboParaCancelar = null;
    this.cargarRecibos();
    this.cargarStats();
  }

  // ── Pago modal ──

  abrirPagoModal(recibo: Recibo): void { this.reciboParaPago = recibo; }

  onPagado(raw: ReciboAPI): void {
    this.reciboParaPago = null;
    this._actualizarReciboEnLista(raw);
    this.cargarStats();
  }

  getPagoLabel(recibo: Recibo): string {
    if (!recibo.metodosPago || recibo.metodosPago.length === 0) return '—';
    if (recibo.metodosPago.length === 1) return recibo.metodosPago[0].nombre;
    const primary = recibo.metodosPago.find(mp => mp.nombre === 'EFECTIVO')
      || recibo.metodosPago.find(mp => mp.nombre !== 'EXENTO' && mp.nombre !== 'PENDIENTE')
      || recibo.metodosPago[0];
    return primary.nombre + ' +';
  }

  getPagoLabelClass(recibo: Recibo): string {
    const label = this.getPagoLabel(recibo).replace(' +', '');
    const map: Record<string, string> = {
      'EFECTIVO': 'text-emerald-600',
      'TARJETA': 'text-blue-600',
      'TRANSFERENCIA': 'text-purple-600',
      'EXENTO': 'text-slate-500',
      'PENDIENTE': 'text-amber-600',
    };
    return map[label] || 'text-slate-700';
  }

  // ── Private helpers ──

  private _mapearRecibo(r: ReciboAPI): Recibo {
    return {
      idVenta: r.id_venta,
      folioVenta: r.folio_venta ?? '',
      idPaciente: r.id_paciente ?? 0,
      nombrePaciente: r.nombre_paciente ?? '',
      folioPaciente: r.folio_paciente ?? '',
      fechaVenta: r.fecha_venta ?? '',
      montoTotal: r.monto_total,
      montoPagado: r.monto_pagado,
      saldoPendiente: r.saldo_pendiente,
      exentoPago: r.exento_pago ?? '',
      cancelada: r.cancelada ?? '',
      motivoCancelacion: r.motivo_cancelacion ?? null,
      metodosPago: (r.metodos_pago || []).map((mp: MetodoPagoReciboItem) => ({ idMetodoPago: mp.id_metodo_pago, nombre: mp.nombre, monto: mp.monto }))
    };
  }

  private _actualizarReciboEnLista(raw: ReciboAPI): void {
    const mapped = this._mapearRecibo(raw);
    const idx = this.recibos.findIndex(r => r.idVenta === mapped.idVenta);
    if (idx !== -1) this.recibos[idx] = mapped;
    if (this.reciboParaDetalle?.idVenta === mapped.idVenta) this.reciboParaDetalle = mapped;
    if (this.reciboParaPago?.idVenta === mapped.idVenta) this.reciboParaPago = mapped;
    this.filtrarRecibos();
    this.calcularEstadisticas();
  }

  private _getReciboSortValue(recibo: Recibo, key: string): unknown {
    switch (key) {
      case 'folioVenta': return recibo.folioVenta;
      case 'nombrePaciente': return recibo.nombrePaciente;
      case 'fechaVenta': return recibo.fechaVenta;
      case 'montoTotal': return recibo.montoTotal;
      case 'montoPagado': return recibo.montoPagado;
      case 'saldoPendiente': return recibo.saldoPendiente;
      case 'pago': return this.getPagoLabel(recibo);
      case 'estado': return recibo.cancelada === 'S' ? 'cancelada' : (recibo.saldoPendiente === 0 ? 'pagada' : 'pendiente');
      default: return recibo.fechaVenta;
    }
  }

  private _sortRows<T>(rows: T[], sort: TableSortState, valueGetter: (row: T, key: string) => unknown): T[] {
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = this._toComparableValue(valueGetter(a, sort.key));
      const right = this._toComparableValue(valueGetter(b, sort.key));
      if (left < right) return -1 * dir;
      if (left > right) return 1 * dir;
      return 0;
    });
  }

  private _toComparableValue(value: unknown): number | string {
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
