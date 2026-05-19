import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface BeneficiarioOption {
  id: number;
  folio: string;
  nombre: string;
  tipoCuota: string;
}

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

@Component({
  selector: 'app-nuevo-cobro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nuevo-cobro.component.html',
})
export class NuevoCobroComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  guardandoCobro = false;
  nuevoCobroError = '';
  beneficiariosList: BeneficiarioOption[] = [];
  beneficiarioBusqueda = '';
  showBeneficiarioDropdown = false;
  beneficiariosFiltradosCobro: BeneficiarioOption[] = [];
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

  nuevoCobro = {
    id_paciente: 0,
    monto_total: 0,
    exento_pago: 'N',
    metodos_pago: [{ id_metodo_pago: 0, monto: 0 }] as MetodoPagoRow[],
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiariosList = data.map((b) => ({
          id: b.id_paciente,
          folio: b.folio_paciente ?? b.folio,
          nombre: b.nombre_completo ?? ((b.nombre || '') + ' ' + (b.apellido_paterno || '') + ' ' + (b.apellido_materno || '')).trim(),
          tipoCuota: b.tipo_cuota || 'A',
        }));
      },
      error: (err) => console.error('Error al cargar beneficiarios:', err),
    });

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
    const b = this.beneficiariosList.find(item => item.id === this.nuevoCobro.id_paciente);
    return b?.tipoCuota === 'B' ? 'B' : 'A';
  }

  precioParaCuota(item: ConceptoCobroOption): number {
    const cuota = this.tipoCuotaBeneficiarioSeleccionado;
    if (cuota === 'B' && item.precioB > 0) return item.precioB;
    if (item.precioA > 0) return item.precioA;
    return item.precioDefault;
  }

  agregarSeleccionados(): void {
    const allItems = [...this.serviciosCatalogo, ...this.laboratoriosCatalogo, ...this.productosCatalogo];
    for (const [key, cantidad] of Object.entries(this.cantidadesCatalogo)) {
      if (cantidad <= 0) continue;
      const [tipoStr, idStr] = key.split('_');
      const tipo = tipoStr as 'SERVICIO' | 'PRODUCTO';
      const id = Number(idStr);
      const found = allItems.find(c => c.tipo === tipo && c.id === id);
      if (!found) continue;
      const precio = this.precioParaCuota(found);
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
  }

  // ── Beneficiary combobox ──

  filtrarBeneficiariosCobro(): void {
    const q = this.beneficiarioBusqueda.toLowerCase().trim();
    this.nuevoCobro.id_paciente = 0;
    this.beneficiariosFiltradosCobro = q
      ? this.beneficiariosList.filter(b => b.nombre.toLowerCase().includes(q) || (b.folio || '').toLowerCase().includes(q)).slice(0, 20)
      : this.beneficiariosList.slice(0, 10);
    this.showBeneficiarioDropdown = true;
  }

  onBeneficiarioBusquedaFocus(): void {
    const q = this.beneficiarioBusqueda.toLowerCase().trim();
    this.beneficiariosFiltradosCobro = q
      ? this.beneficiariosList.filter(b => b.nombre.toLowerCase().includes(q) || (b.folio || '').toLowerCase().includes(q)).slice(0, 20)
      : this.beneficiariosList.slice(0, 10);
    this.showBeneficiarioDropdown = true;
  }

  onBeneficiarioBusquedaBlur(): void {
    setTimeout(() => { this.showBeneficiarioDropdown = false; }, 200);
  }

  seleccionarBeneficiarioCobro(b: BeneficiarioOption): void {
    this.nuevoCobro.id_paciente = b.id;
    this.beneficiarioBusqueda = `${b.folio} - ${b.nombre}`;
    this.showBeneficiarioDropdown = false;
    if (this.itemsNuevoCobro.length > 0) this.recalcularTotalDesdeItems();
  }

  limpiarSeleccionBeneficiario(): void {
    this.nuevoCobro.id_paciente = 0;
    this.beneficiarioBusqueda = '';
    this.beneficiariosFiltradosCobro = this.beneficiariosList.slice(0, 10);
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

  close(): void { this.closed.emit(); }

  guardarCobro(): void {
    if (!this.nuevoCobro.id_paciente) {
      this.nuevoCobroError = 'Selecciona un paciente.';
      return;
    }
    if (this.nuevoCobro.monto_total <= 0) {
      this.nuevoCobroError = 'El monto total debe ser mayor a 0.';
      return;
    }
    if (this.itemsNuevoCobro.length === 0) {
      this.nuevoCobroError = 'Agrega al menos un concepto al cobro.';
      return;
    }
    const metodosValidos = this.nuevoCobro.metodos_pago.filter(mp => mp.id_metodo_pago > 0 && mp.monto > 0);
    if (this.nuevoCobro.exento_pago !== 'S' && metodosValidos.length === 0) {
      this.nuevoCobroError = 'Agrega al menos un metodo de pago con monto.';
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
        this.saved.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.guardandoCobro = false;
        this.nuevoCobroError = err?.error?.detail || 'Error al crear el recibo. Intenta de nuevo.';
        console.error('Error al crear recibo:', err);
      },
    });
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
      },
      error: (err) => console.error('Error al cargar servicios para cobro:', err),
    });

    this.api.getServicios({ activo: 'S', categoria: 'LABORATORIO' }).subscribe({
      next: (data) => {
        this.laboratoriosCatalogo = data.map((s) => ({
          id: s.id_servicio, nombre: s.nombre, tipo: 'SERVICIO' as const,
          precioA: Number(s.precio_cuota_a ?? s.cuota_recuperacion ?? 0),
          precioB: Number(s.precio_cuota_b ?? s.cuota_recuperacion ?? 0),
          precioDefault: Number(s.cuota_recuperacion ?? s.precio_cuota_a ?? s.precio_cuota_b ?? 0),
        }));
      },
      error: (err) => console.error('Error al cargar laboratorios para cobro:', err),
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
