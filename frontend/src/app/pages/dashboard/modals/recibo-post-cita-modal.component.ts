import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { getApiError } from '../../../shared/utils/error.utils';

interface VentaLineaForm {
  tipo: 'SERVICIO' | 'PRODUCTO';
  id: number;
  descripcion: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

interface CatalogoItem {
  id: number;
  nombre: string;
  tipo: 'SERVICIO' | 'PRODUCTO';
  precioA: number;
  precioB: number;
  precioDefault: number;
}

export interface ReciboModalPaciente {
  idPaciente: number;
  nombre: string;
  folio: string;
  tipoCuota: string;
  idServicio?: number | null;
  servicio?: string;
}

@Component({
  selector: 'app-recibo-post-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recibo-post-cita-modal.component.html',
})
export class ReciboPostCitaModalComponent implements OnChanges {
  @Input() paciente: ReciboModalPaciente | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  items: VentaLineaForm[] = [];
  metodosPago: { id_metodo_pago: number; monto: number }[] = [{ id_metodo_pago: 0, monto: 0 }];
  exento = 'N';
  total = 0;
  montoPagado = 0;
  saldoPendiente = 0;
  error = '';
  guardando = false;

  stagingTipo: 'SERVICIO' | 'PRODUCTO' = 'SERVICIO';
  stagingId = 0;
  stagingCantidad = 1;
  stagingPrecioHint = 0;

  metodosPagoCatalogo: { id: number; nombre: string }[] = [];
  servicios: CatalogoItem[] = [];
  productos: CatalogoItem[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paciente'] && this.paciente) {
      this.reset();
      this.cargarCatalogos();
    }
  }

  private reset(): void {
    this.items = [];
    this.metodosPago = [{ id_metodo_pago: 0, monto: 0 }];
    this.exento = 'N';
    this.total = 0;
    this.montoPagado = 0;
    this.saldoPendiente = 0;
    this.error = '';
    this.guardando = false;
    this.stagingTipo = 'SERVICIO';
    this.stagingId = 0;
    this.stagingCantidad = 1;
    this.stagingPrecioHint = 0;
  }

  private cargarCatalogos(): void {
    if (this.metodosPagoCatalogo.length === 0) {
      this.api.getMetodosPago().subscribe({
        next: (data) => {
          this.metodosPagoCatalogo = data.map((m) => ({ id: m.id_metodo_pago ?? 0, nombre: m.nombre }));
        },
      });
    }
    if (this.servicios.length === 0) {
      this.api.getServicios({ activo: 'S' }).subscribe({
        next: (data) => {
          this.servicios = data.map((s) => ({
            id: s.id_servicio,
            nombre: s.nombre,
            tipo: 'SERVICIO',
            precioA: Number(s.precio_cuota_a ?? s.cuota_recuperacion ?? 0),
            precioB: Number(s.precio_cuota_b ?? s.cuota_recuperacion ?? 0),
            precioDefault: Number(s.cuota_recuperacion ?? s.precio_cuota_a ?? 0),
          }));
          this.preAddServicioCita();
        },
      });
    } else {
      this.preAddServicioCita();
    }
    if (this.productos.length === 0) {
      this.api.getProductos({ activo: 'S' }).subscribe({
        next: (data) => {
          this.productos = data.map((p) => ({
            id: p.id_producto,
            nombre: p.nombre,
            tipo: 'PRODUCTO',
            precioA: Number(p.precio_cuota_a ?? 0),
            precioB: Number(p.precio_cuota_b ?? 0),
            precioDefault: Number(p.precio_cuota_a ?? 0),
          }));
        },
      });
    }
  }

  private preAddServicioCita(): void {
    if (!this.paciente?.idServicio || this.items.length > 0) return;
    const found = this.servicios.find(s => s.id === this.paciente!.idServicio);
    if (found) {
      const tipoCuota = this.paciente?.tipoCuota || 'A';
      let precio = tipoCuota === 'B' ? found.precioB : found.precioA;
      if (!precio || precio <= 0) precio = found.precioDefault || 0;
      this.items = [{
        tipo: 'SERVICIO',
        id: found.id,
        descripcion: found.nombre,
        precio_unitario: precio,
        cantidad: 1,
        subtotal: Number(precio.toFixed(2)),
      }];
      this.recalcularTotal();
    } else {
      this.items = [{
        tipo: 'SERVICIO',
        id: this.paciente!.idServicio!, // NOSONAR: typescript:S4325
        descripcion: this.paciente?.servicio || 'Consulta',
        precio_unitario: 0,
        cantidad: 1,
        subtotal: 0,
      }];
    }
  }

  get conceptosDisponibles(): CatalogoItem[] {
    return this.stagingTipo === 'SERVICIO' ? this.servicios : this.productos;
  }

  onTipoChange(): void {
    this.stagingId = 0;
    this.stagingCantidad = 1;
    this.stagingPrecioHint = 0;
  }

  onItemChange(): void {
    const found = this.conceptosDisponibles.find(c => c.id === this.stagingId);
    if (!found) { this.stagingPrecioHint = 0; return; }
    const tipoCuota = this.paciente?.tipoCuota || 'A';
    let precio = tipoCuota === 'B' ? found.precioB : found.precioA;
    if (!precio || precio <= 0) precio = found.precioDefault || 0;
    this.stagingPrecioHint = precio;
    if (this.stagingTipo === 'SERVICIO') this.stagingCantidad = 1;
  }

  agregarItem(): void {
    if (this.stagingId === 0) return;
    const found = this.conceptosDisponibles.find(c => c.id === this.stagingId);
    if (!found) return;
    const tipoCuota = this.paciente?.tipoCuota || 'A';
    let precio = tipoCuota === 'B' ? found.precioB : found.precioA;
    if (!precio || precio <= 0) precio = found.precioDefault || 0;
    const cantidad = this.stagingTipo === 'SERVICIO' ? 1 : (this.stagingCantidad || 1);
    this.items.push({
      tipo: this.stagingTipo,
      id: found.id,
      descripcion: found.nombre,
      precio_unitario: precio,
      cantidad,
      subtotal: Number((precio * cantidad).toFixed(2)),
    });
    this.stagingId = 0;
    this.stagingCantidad = 1;
    this.stagingPrecioHint = 0;
    this.recalcularTotal();
  }

  removerItem(index: number): void {
    this.items.splice(index, 1);
    this.recalcularTotal();
  }

  recalcularTotal(): void {
    this.total = Number(this.items.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    this.recalcularSaldo();
  }

  recalcularSaldo(): void {
    this.montoPagado = this.metodosPago.reduce((s, mp) => s + (mp.monto || 0), 0);
    this.saldoPendiente = Math.max(0, this.total - this.montoPagado);
  }

  agregarMetodo(): void {
    this.metodosPago.push({ id_metodo_pago: 0, monto: 0 });
  }

  removerMetodo(index: number): void {
    this.metodosPago.splice(index, 1);
    this.recalcularSaldo();
  }

  onExentoChange(): void {
    if (this.exento === 'S') {
      const exentoMethod = this.metodosPagoCatalogo.find(m => m.nombre === 'EXENTO');
      this.metodosPago = exentoMethod
        ? [{ id_metodo_pago: exentoMethod.id, monto: this.total }]
        : [];
    } else {
      this.metodosPago = [{ id_metodo_pago: 0, monto: 0 }];
    }
    this.recalcularSaldo();
  }

  guardar(): void {
    if (!this.paciente || this.items.length === 0) return;
    const metodosValidos = this.metodosPago.filter(mp => mp.id_metodo_pago > 0 && mp.monto > 0);
    if (this.exento !== 'S' && metodosValidos.length === 0) {
      this.error = 'Agrega al menos un método de pago con monto.';
      return;
    }
    this.error = '';
    this.guardando = true;
    const payload = {
      id_paciente: this.paciente.idPaciente,
      monto_total: this.total,
      monto_pagado: this.montoPagado,
      saldo_pendiente: this.saldoPendiente,
      exento_pago: this.exento,
      metodos_pago: metodosValidos.map(mp => ({ id_metodo_pago: mp.id_metodo_pago, monto: mp.monto })),
      items: this.items.map(item => ({
        tipo: item.tipo,
        id_referencia: item.id,
        descripcion: item.descripcion,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
      })),
    };
    this.api.createRecibo(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.guardado.emit();
      },
      error: (err: unknown) => {
        this.guardando = false;
        this.error = getApiError(err, 'Error al guardar el recibo.');
      },
    });
  }
}
