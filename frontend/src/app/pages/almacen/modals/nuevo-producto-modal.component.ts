import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AutoGrowDirective } from '../../../shared/directives/auto-grow.directive';
import { ProductoItem } from '../almacen.models';

@Component({
  selector: 'app-nuevo-producto-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoGrowDirective],
  templateUrl: './nuevo-producto-modal.component.html',
})
export class NuevoProductoModalComponent implements OnChanges {
  @Input() editingProduct: ProductoItem | null = null;
  @Input() initialTipo = '';
  @Output() closed = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  submitting = false;
  form = this._emptyForm();

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingProduct'] || changes['initialTipo']) {
      if (this.editingProduct) {
        const p = this.editingProduct;
        this.form = {
          clave_interna: p.claveInterna,
          nombre: p.nombre,
          descripcion: p.descripcion,
          tipo_producto: p.tipoProducto,
          categoria: 'SERVICIO',
          precio_cuota_a: p.precioA,
          precio_cuota_b: p.precioB,
          activo: p.activo,
          presentacion: p.presentacion ?? '',
          dosis: p.dosis ?? '',
          requiere_caducidad: p.requiereCaducidad ?? 'S',
          numero_serie: p.numeroSerie ?? '',
          marca: p.marca ?? '',
          modelo: p.modelo ?? '',
          estatus_equipo: p.estatusEquipo ?? 'DISPONIBLE',
          observaciones: p.observaciones ?? '',
          cuota_recuperacion: 0,
          cantidad_disponible: p.cantidadDisponible ?? 0,
          nivel_minimo: p.nivelMinimo ?? 5,
          unidad_medida: p.unidadMedida,
          fecha_caducidad: p.fechaCaducidad ? p.fechaCaducidad.substring(0, 10) : '',
        };
      } else {
        this.form = this._emptyForm();
        if (this.initialTipo) this.form.tipo_producto = this.initialTipo;
      }
      this.submitting = false;
    }
  }

  submit(): void {
    if (!this.form.nombre || !this.form.tipo_producto) return;
    if (this.form.tipo_producto !== 'SERVICIO' && !this.form.clave_interna) return;
    this.submitting = true;
    const f = this.form;

    if (f.tipo_producto === 'SERVICIO') {
      this.api.createServicio({
        nombre: f.nombre, descripcion: f.descripcion, activo: f.activo,
        precio_cuota_a: f.precio_cuota_a, precio_cuota_b: f.precio_cuota_b,
        cuota_recuperacion: f.cuota_recuperacion ?? 0, categoria: f.categoria ?? 'SERVICIO',
      }).subscribe({
        next: () => { this.submitting = false; this.guardado.emit(); },
        error: () => { this.submitting = false; },
      });
      return;
    }

    const base = {
      clave_interna: f.clave_interna, nombre: f.nombre, descripcion: f.descripcion,
      tipo_producto: f.tipo_producto, precio_cuota_a: f.precio_cuota_a,
      precio_cuota_b: f.precio_cuota_b, activo: f.activo,
    };
    const payload = f.tipo_producto === 'MEDICAMENTO'
      ? { ...base, presentacion: f.presentacion, dosis: f.dosis, requiere_caducidad: f.requiere_caducidad,
          cantidad_disponible: f.cantidad_disponible, nivel_minimo: f.nivel_minimo,
          unidad_medida: f.unidad_medida, fecha_caducidad: f.fecha_caducidad || null }
      : { ...base, numero_serie: f.numero_serie, marca: f.marca, modelo: f.modelo,
          estatus_equipo: f.estatus_equipo, observaciones: f.observaciones,
          cantidad_disponible: f.cantidad_disponible, nivel_minimo: f.nivel_minimo,
          unidad_medida: f.unidad_medida };

    const obs = this.editingProduct
      ? this.api.updateProducto(this.editingProduct.idProducto, payload)
      : this.api.createProducto(payload);

    obs.subscribe({
      next: () => { this.submitting = false; this.guardado.emit(); },
      error: () => { this.submitting = false; },
    });
  }

  private _emptyForm() {
    return {
      clave_interna: '', nombre: '', descripcion: '', tipo_producto: '', categoria: 'SERVICIO',
      precio_cuota_a: null as number | null, precio_cuota_b: null as number | null, activo: 'S',
      presentacion: '', dosis: '', requiere_caducidad: 'S', numero_serie: '', marca: '', modelo: '',
      estatus_equipo: 'DISPONIBLE', observaciones: '', cuota_recuperacion: 0,
      cantidad_disponible: 0, nivel_minimo: 5, unidad_medida: '', fecha_caducidad: '',
    };
  }
}
