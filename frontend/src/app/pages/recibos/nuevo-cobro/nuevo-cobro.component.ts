import { Component, Input, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { BeneficiarioComboboxComponent, BeneficiarioSeleccionado } from '../../../shared/components/beneficiario-combobox/beneficiario-combobox.component';

interface MetodoPagoCatalogo {
  id: number;
  nombre: string;
}

interface MetodoPagoRow {
  id_metodo_pago: number;
  monto: number;
}

interface VentaLineaForm {
  tipo: 'SERVICIO' | 'PRODUCTO';
  id: number;
  descripcion: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

interface ConceptoCobroOption {
  id: number;
  nombre: string;
  tipo: 'SERVICIO' | 'PRODUCTO';
  precioA: number;
  precioB: number;
  precioDefault: number;
}

export interface PreselectedPacienteCobro {
  idPaciente: number;
  nombre: string;
  folio: string;
  tipoCuota: string;
}

export interface PreselectedCobroServicio {
  idServicio: number;
  nombre: string;
  cantidad?: number;
}

@Component({
  selector: 'app-nuevo-cobro',
  standalone: true,
  imports: [CommonModule, FormsModule, BeneficiarioComboboxComponent],
  templateUrl: './nuevo-cobro.component.html',
})
export class NuevoCobroComponent implements OnInit {
  @Input() preselectedPaciente: PreselectedPacienteCobro | null = null;
  @Input() preselectedServicios: PreselectedCobroServicio[] = [];
  @Input() preselectedServicioId: number | null = null;
  @Input() preselectedServicioNombre: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @ViewChild('cobroModal') private readonly cobroModal!: ElementRef<HTMLElement>;

  guardandoCobro = false;
  nuevoCobroError = '';
  metodosPagoCatalogo: MetodoPagoCatalogo[] = [];
  serviciosCatalogo: ConceptoCobroOption[] = [];
  productosCatalogo: ConceptoCobroOption[] = [];
  laboratoriosCatalogo: ConceptoCobroOption[] = [];
  nuevoCobroMontoPagado = 0;
  nuevoCobroSaldoPendiente = 0;
  itemsNuevoCobro: VentaLineaForm[] = [];
  catalogoTab: 'SERVICIO' | 'LABORATORIO' | 'PRODUCTO' = 'SERVICIO';
  catalogoFiltro = '';
  cantidadesCatalogo: Record<string, number> = {};

  /** tipoCuota del beneficiario actualmente seleccionado. */
  selectedTipoCuota = 'A';

  nuevoCobro = {
    id_paciente: 0,
    monto_total: 0,
    exento_pago: 'N',
    metodos_pago: [{ id_metodo_pago: 0, monto: 0 }] as MetodoPagoRow[],
  };

  private static readonly CART_KEY = 'ebif_nuevo_cobro_cart';
  private serviciosCobroCargados = false;
  private laboratoriosCobroCargados = false;
  private preselectedServiciosAgregados = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    if (this.preselectedPaciente) {
      this.nuevoCobro.id_paciente = this.preselectedPaciente.idPaciente;
      this.selectedTipoCuota = this.preselectedPaciente.tipoCuota || 'A';
    }

    // Restaurar carrito desde localStorage si no hay paciente preseleccionado
    if (!this.preselectedPaciente && !this.preselectedServicioId && this.preselectedServicios.length === 0) {
      try {
        const saved = localStorage.getItem(NuevoCobroComponent.CART_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as VentaLineaForm[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.itemsNuevoCobro = parsed;
            this.recalcularTotalDesdeItems();
          }
        }
      } catch { /* noop */ }
    }

    this.api.getMetodosPago().subscribe({
      next: (data) => {
        this.metodosPagoCatalogo = data.map((m) => ({
          id: m.id_metodo_pago ?? 0,
          nombre: m.nombre,
        }));
      },
      error: (err) => console.error('Error al cargar metodos de pago:', err),
    });

    this._cargarCatalogoCobros();
  }

  /** Computed initial value for the combobox when a patient is pre-selected. */
  get comboboxInitialValue(): BeneficiarioSeleccionado | null {
    if (!this.preselectedPaciente) return null;
    return {
      id: this.preselectedPaciente.idPaciente,
      folio: this.preselectedPaciente.folio,
      nombre: this.preselectedPaciente.nombre,
      tipoCuota: this.preselectedPaciente.tipoCuota,
    };
  }

  onBeneficiarioSeleccionado(b: BeneficiarioSeleccionado | null): void {
    if (b) {
      this.nuevoCobro.id_paciente = b.id;
      this.selectedTipoCuota = b.tipoCuota || 'A';
      if (this.itemsNuevoCobro.length > 0) this.recalcularTotalDesdeItems();
    } else {
      this.nuevoCobro.id_paciente = 0;
      this.selectedTipoCuota = 'A';
    }
  }

  // ── Multi-select catalog ──

  getCatalogKey(tipo: string, id: number): string { return `${tipo}_${id}`; }

  getCantidad(tipo: string, id: number): number {
    return this.cantidadesCatalogo[this.getCatalogKey(tipo, id)] ?? 0;
  }

  setCantidad(tipo: string, id: number, val: number): void {
    const key = this.getCatalogKey(tipo, id);
    const n = Math.max(0, Math.floor(Number(val) || 0));
    const updated = { ...this.cantidadesCatalogo };
    if (n === 0) delete updated[key];
    else updated[key] = n;
    this.cantidadesCatalogo = updated;
  }

  get catalogoActivo(): ConceptoCobroOption[] {
    let list: ConceptoCobroOption[];
    if (this.catalogoTab === 'SERVICIO') list = this.serviciosCatalogo;
    else if (this.catalogoTab === 'LABORATORIO') list = this.laboratoriosCatalogo;
    else list = this.productosCatalogo;
    if (!this.catalogoFiltro) return list;
    const q = this.catalogoFiltro.toLowerCase();
    return list.filter(c => c.nombre.toLowerCase().includes(q));
  }

  get totalSeleccionados(): number {
    return Object.values(this.cantidadesCatalogo).filter(v => v > 0).length;
  }

  get tipoCuotaBeneficiarioSeleccionado(): string {
    return this.selectedTipoCuota === 'B' ? 'B' : 'A';
  }

  precioParaCuota(item: ConceptoCobroOption): number {
    const cuota = this.tipoCuotaBeneficiarioSeleccionado;
    if (cuota === 'B' && item.precioB > 0) return item.precioB;
    if (item.precioA > 0) return item.precioA;
    return item.precioDefault;
  }

  agregarSeleccionados(): void {
    for (const [key, cantidad] of Object.entries(this.cantidadesCatalogo)) {
      if (cantidad <= 0) continue;
      const [tabStr, idStr] = key.split('_');
      const id = Number(idStr);
      let found: ConceptoCobroOption | undefined;
      if (tabStr === 'LABORATORIO') {
        found = this.laboratoriosCatalogo.find(c => c.id === id);
      } else if (tabStr === 'SERVICIO') {
        found = this.serviciosCatalogo.find(c => c.id === id);
      } else {
        found = this.productosCatalogo.find(c => c.id === id);
      }
      if (!found) continue;
      const precio = this.precioParaCuota(found);
      const tipo = found.tipo;
      const existing = this.itemsNuevoCobro.findIndex(i => i.id === id && i.tipo === tipo);
      if (existing >= 0) {
        this.itemsNuevoCobro[existing].cantidad += cantidad;
        this.itemsNuevoCobro[existing].subtotal = this.itemsNuevoCobro[existing].cantidad * precio;
      } else {
        this.itemsNuevoCobro.push({ tipo, id, descripcion: found.nombre, cantidad, precio_unitario: precio, subtotal: precio * cantidad });
      }
    }
    this.cantidadesCatalogo = {};
    this.catalogoFiltro = '';
    this.recalcularTotalDesdeItems();
  }

  removerItem(index: number): void {
    this.itemsNuevoCobro.splice(index, 1);
    this.recalcularTotalDesdeItems();
  }

  recalcularTotalDesdeItems(): void {
    this.nuevoCobro.monto_total = Number(
      this.itemsNuevoCobro.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
    );
    this.calcularSaldoCobro();
    this._persistirCarrito();
  }

  private _setError(msg: string): void {
    this.nuevoCobroError = msg;
    // Scroll suave al top del modal para que el banner de error quede visible
    setTimeout(() => {
      this.cobroModal?.nativeElement?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 30);
  }

  private _persistirCarrito(): void {
    try {
      if (this.itemsNuevoCobro.length > 0) {
        localStorage.setItem(NuevoCobroComponent.CART_KEY, JSON.stringify(this.itemsNuevoCobro));
      } else {
        localStorage.removeItem(NuevoCobroComponent.CART_KEY);
      }
    } catch { /* noop */ }
  }

  private _limpiarCarritoGuardado(): void {
    try { localStorage.removeItem(NuevoCobroComponent.CART_KEY); } catch { /* noop */ }
  }

  // ── Payment methods ──

  agregarMetodoPago(): void {
    this.nuevoCobro.metodos_pago.push({ id_metodo_pago: 0, monto: 0 });
  }

  removerMetodoPago(index: number): void {
    this.nuevoCobro.metodos_pago.splice(index, 1);
    this.calcularSaldoCobro();
  }

  calcularSaldoCobro(): void {
    this.nuevoCobroMontoPagado = this.nuevoCobro.metodos_pago.reduce((sum, mp) => sum + (mp.monto || 0), 0);
    this.nuevoCobroSaldoPendiente = Math.max(0, (this.nuevoCobro.monto_total || 0) - this.nuevoCobroMontoPagado);
  }

  onExentoPagoChange(): void {
    if (this.nuevoCobro.exento_pago === 'S') {
      const exentoMethod = this.metodosPagoCatalogo.find(m => m.nombre === 'EXENTO');
      if (exentoMethod) {
        this.nuevoCobro.metodos_pago = [{ id_metodo_pago: exentoMethod.id, monto: this.nuevoCobro.monto_total || 0 }];
      } else {
        this.nuevoCobro.metodos_pago = [];
      }
    } else {
      this.nuevoCobro.metodos_pago = [{ id_metodo_pago: 0, monto: 0 }];
    }
    this.calcularSaldoCobro();
  }

  // ── Submit ──

  close(): void { this._limpiarCarritoGuardado(); this.closed.emit(); }

  guardarCobro(): void {
    if (!this.nuevoCobro.id_paciente) {
      this._setError('Selecciona un beneficiario antes de guardar el cobro.');
      return;
    }
    if (this.nuevoCobro.monto_total <= 0) {
      this._setError('El monto total debe ser mayor a 0. Agrega al menos un concepto.');
      return;
    }
    if (this.itemsNuevoCobro.length === 0) {
      this._setError('Agrega al menos un concepto al cobro antes de continuar.');
      return;
    }
    const metodosValidos = this.nuevoCobro.metodos_pago.filter(mp => mp.id_metodo_pago > 0 && mp.monto > 0);
    if (this.nuevoCobro.exento_pago !== 'S' && metodosValidos.length === 0) {
      this._setError('Agrega al menos un método de pago con monto antes de guardar.');
      return;
    }

    this.nuevoCobroError = '';
    this.guardandoCobro = true;

    const payload = {
      id_paciente: this.nuevoCobro.id_paciente,
      monto_total: this.nuevoCobro.monto_total,
      monto_pagado: this.nuevoCobroMontoPagado,
      saldo_pendiente: this.nuevoCobroSaldoPendiente,
      exento_pago: this.nuevoCobro.exento_pago,
      metodos_pago: metodosValidos.map(mp => ({ id_metodo_pago: mp.id_metodo_pago, monto: mp.monto })),
      items: this.itemsNuevoCobro.map(item => ({
        tipo: item.tipo,
        id_referencia: item.id,
        descripcion: item.descripcion,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
      })),
    };

    this.api.createRecibo(payload).subscribe({
      next: () => {
        this.guardandoCobro = false;
        this._limpiarCarritoGuardado();
        this.saved.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.guardandoCobro = false;
        this._setError(err?.error?.detail || 'Error al guardar el cobro. Intenta de nuevo.');
      },
    });
  }

  private _serviciosPreseleccionados(): PreselectedCobroServicio[] {
    if (this.preselectedServicios.length > 0) return this.preselectedServicios;
    if (!this.preselectedServicioId) return [];
    return [{
      idServicio: this.preselectedServicioId,
      nombre: this.preselectedServicioNombre || 'Servicio de la cita',
      cantidad: 1,
    }];
  }

  private _preAddServicios(): void {
    const servicios = this._serviciosPreseleccionados();
    if (
      servicios.length === 0 ||
      this.preselectedServiciosAgregados ||
      this.itemsNuevoCobro.length > 0 ||
      !this.serviciosCobroCargados ||
      !this.laboratoriosCobroCargados
    ) return;

    for (const servicio of servicios) {
      const found = this.serviciosCatalogo.find(s => s.id === servicio.idServicio)
        || this.laboratoriosCatalogo.find(s => s.id === servicio.idServicio);
      const cantidad = Math.max(1, Math.floor(Number(servicio.cantidad) || 1));
      const precio = found ? this.precioParaCuota(found) : 0;
      this.itemsNuevoCobro.push({
        tipo: 'SERVICIO',
        id: found?.id ?? servicio.idServicio,
        descripcion: found?.nombre ?? servicio.nombre,
        cantidad,
        precio_unitario: precio,
        subtotal: Number((precio * cantidad).toFixed(2)),
      });
    }
    this.preselectedServiciosAgregados = true;
    this.recalcularTotalDesdeItems();
  }

  private _cargarCatalogoCobros(): void {
    this.api.getServicios({ activo: 'S', categoria: 'SERVICIO' }).subscribe({
      next: (data) => {
        this.serviciosCatalogo = data.map((s) => ({
          id: s.id_servicio, nombre: s.nombre, tipo: 'SERVICIO' as const,
          precioA: Number(s.precio_cuota_a ?? s.cuota_recuperacion ?? 0),
          precioB: Number(s.precio_cuota_b ?? s.cuota_recuperacion ?? 0),
          precioDefault: Number(s.cuota_recuperacion ?? s.precio_cuota_a ?? s.precio_cuota_b ?? 0),
        }));
        this.serviciosCobroCargados = true;
        this._preAddServicios();
      },
      error: (err) => {
        this.serviciosCobroCargados = true;
        this._preAddServicios();
        console.error('Error al cargar servicios para cobro:', err);
      },
    });

    this.api.getServicios({ activo: 'S', categoria: 'LABORATORIO' }).subscribe({
      next: (data) => {
        this.laboratoriosCatalogo = data.map((s) => ({
          id: s.id_servicio, nombre: s.nombre, tipo: 'SERVICIO' as const,
          precioA: Number(s.precio_cuota_a ?? s.cuota_recuperacion ?? 0),
          precioB: Number(s.precio_cuota_b ?? s.cuota_recuperacion ?? 0),
          precioDefault: Number(s.cuota_recuperacion ?? s.precio_cuota_a ?? s.precio_cuota_b ?? 0),
        }));
        this.laboratoriosCobroCargados = true;
        this._preAddServicios();
      },
      error: (err) => {
        this.laboratoriosCobroCargados = true;
        this._preAddServicios();
        console.error('Error al cargar laboratorios para cobro:', err);
      },
    });

    this.api.getProductos({ activo: 'S' }).subscribe({
      next: (data) => {
        this.productosCatalogo = data.map((p) => ({
          id: p.id_producto, nombre: p.nombre, tipo: 'PRODUCTO' as const,
          precioA: Number(p.precio_cuota_a ?? 0),
          precioB: Number(p.precio_cuota_b ?? 0),
          precioDefault: Number(p.precio_cuota_a ?? p.precio_cuota_b ?? 0),
        }));
      },
      error: (err) => console.error('Error al cargar productos para cobro:', err),
    });
  }
}
