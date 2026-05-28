import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AutoGrowDirective } from '../../../../shared/directives/auto-grow.directive';
import { BeneficiarioComboboxComponent, BeneficiarioSeleccionado } from '../../../../shared/components/beneficiario-combobox/beneficiario-combobox.component';
import { ComodatoItem, ProductoItem, TableSortState, sortRows } from '../../almacen.models';

interface ComodatoEditForm {
  id_paciente: number | null;
  id_equipo: number | null;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  estatus: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  exento_pago: string;
  notas: string | null;
}

@Component({
  selector: 'app-comodatos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoGrowDirective, BeneficiarioComboboxComponent],
  templateUrl: './comodatos-tab.component.html',
})
export class ComodatosTabComponent {
  @Input() comodatos: ComodatoItem[] = [];
  @Input() productos: ProductoItem[] = [];
  @Input() isAdmin = false;
  @Input() debugMode = false;
  @Output() refreshNeeded = new EventEmitter<void>();
  @Output() printRequested = new EventEmitter<ComodatoItem>();

  search = '';
  sort: TableSortState = { key: 'fechaPrestamo', direction: 'desc' };

  // Nuevo comodato
  showNuevoModal = false;
  comodatoForm = this._emptyForm();
  metodosPagoCatalogo: { id: number; nombre: string }[] = [];
  metodosPagoNuevo: { id_metodo_pago: number; monto: number }[] = [{ id_metodo_pago: 0, monto: 0 }];
  submittingNuevo = false;

  // Edit comodato
  showEditModal = false;
  editId = 0;
  editForm: ComodatoEditForm = { id_paciente: null, id_equipo: null, fecha_prestamo: '', fecha_devolucion: null, estatus: 'PRESTADO', monto_total: 0, monto_pagado: 0, saldo_pendiente: 0, exento_pago: 'N', notas: null };
  submittingEdit = false;

  // Confirm devolución
  showDevolucionModal = false;
  comodatoToDevolver: ComodatoItem | null = null;
  submittingDevolucion = false;

  constructor(private readonly api: ApiService) {}

  get equiposList(): ProductoItem[] {
    return this.productos.filter(p => p.tipoProducto === 'EQUIPO');
  }

  get comodatosVencidos(): ComodatoItem[] {
    const hoy = new Date().toLocaleDateString('en-CA');
    return this.comodatos.filter(c =>
      c.estatus === 'PRESTADO' && c.fechaDevolucion && c.fechaDevolucion.slice(0, 10) < hoy
    );
  }

  get filtered(): ComodatoItem[] {
    const base = this.search.trim()
      ? this.comodatos.filter(c => {
          const q = this.search.toLowerCase();
          return c.nombrePaciente.toLowerCase().includes(q)
            || c.folioComodato.toLowerCase().includes(q)
            || c.nombreEquipo.toLowerCase().includes(q);
        })
      : this.comodatos;

    return sortRows(base, this.sort, (com, key) => {
      switch (key) {
        case 'folioComodato': return com.folioComodato;
        case 'beneficiario': return `${com.nombrePaciente} ${com.folioPaciente}`;
        case 'equipo': return com.nombreEquipo;
        case 'fechaPrestamo': return com.fechaPrestamo;
        case 'fechaDevolucion': return com.fechaDevolucion || '';
        case 'estatus': return com.estatus;
        default: return com.folioComodato;
      }
    });
  }

  toggleSort(key: string): void {
    if (this.sort.key === key) {
      this.sort = { key, direction: this.sort.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      this.sort = { key, direction: 'asc' };
    }
  }

  sortIndicator(key: string): string {
    if (this.sort.key !== key) return '-';
    return this.sort.direction === 'asc' ? '^' : 'v';
  }

  getEstadoBadgeClass(estatus: string): string {
    switch (estatus) {
      case 'PRESTADO': return 'bg-green-100 text-green-700';
      case 'DEVUELTO': return 'bg-slate-100 text-slate-600';
      case 'CANCELADO': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  // ── Nuevo comodato ──

  get montoPagadoNuevo(): number {
    return this.metodosPagoNuevo.reduce((sum, mp) => sum + (mp.monto || 0), 0);
  }

  get saldoPendienteNuevo(): number {
    return Math.max(0, (this.comodatoForm.monto_total || 0) - this.montoPagadoNuevo);
  }

  openNuevo(): void {
    this.comodatoForm = this._emptyForm();
    this.metodosPagoNuevo = [{ id_metodo_pago: 0, monto: 0 }];
    if (this.metodosPagoCatalogo.length === 0) {
      this.api.getMetodosPago().subscribe({
        next: (data) => {
          this.metodosPagoCatalogo = data.map((m) => ({ id: m.id_metodo_pago ?? 0, nombre: m.nombre }));
        },
        error: (err) => console.error('Error al cargar métodos de pago:', err),
      });
    }
    this.showNuevoModal = true;
  }

  closeNuevo(): void {
    this.showNuevoModal = false;
  }

  onBeneficiarioSeleccionado(b: BeneficiarioSeleccionado | null): void {
    this.comodatoForm.id_paciente = b ? b.id : null;
  }

  agregarMetodoPagoNuevo(): void {
    this.metodosPagoNuevo.push({ id_metodo_pago: 0, monto: 0 });
  }

  removerMetodoPagoNuevo(index: number): void {
    this.metodosPagoNuevo.splice(index, 1);
  }

  onExentoNuevoChange(): void {
    if (this.comodatoForm.exento_pago === 'S') {
      const exentoMethod = this.metodosPagoCatalogo.find(m => m.nombre === 'EXENTO');
      this.metodosPagoNuevo = exentoMethod
        ? [{ id_metodo_pago: exentoMethod.id, monto: this.comodatoForm.monto_total || 0 }]
        : [];
    } else {
      this.metodosPagoNuevo = [{ id_metodo_pago: 0, monto: 0 }];
    }
  }

  submitNuevo(): void {
    if (!this.comodatoForm.id_paciente || !this.comodatoForm.id_equipo || !this.comodatoForm.fecha_prestamo) return;
    this.submittingNuevo = true;
    const payload = {
      ...this.comodatoForm,
      monto_pagado: this.montoPagadoNuevo,
      saldo_pendiente: this.saldoPendienteNuevo,
      fecha_devolucion: this.comodatoForm.fecha_devolucion || null,
    };

    this.api.createComodato(payload).subscribe({
      next: () => {
        this.showNuevoModal = false;
        this.submittingNuevo = false;
        this.refreshNeeded.emit();
      },
      error: (err) => {
        console.error('Error creating comodato:', err);
        this.submittingNuevo = false;
      },
    });
  }

  // ── Edit comodato ──

  openEdit(com: ComodatoItem): void {
    this.editId = com.idComodato;
    this.editForm = {
      id_paciente: com.idPaciente,
      id_equipo: com.idEquipo,
      fecha_prestamo: com.fechaPrestamo ? com.fechaPrestamo.substring(0, 10) : '',
      fecha_devolucion: com.fechaDevolucion ? com.fechaDevolucion.substring(0, 10) : '',
      estatus: com.estatus,
      monto_total: com.montoTotal,
      monto_pagado: com.montoPagado,
      saldo_pendiente: com.saldoPendiente,
      exento_pago: com.exentoPago,
      notas: com.notas || '',
    };
    this.showEditModal = true;
  }

  guardarEdit(): void {
    this.submittingEdit = true;
    const payload = { ...this.editForm };
    if (!payload.fecha_devolucion) payload.fecha_devolucion = null;

    this.api.updateComodato(this.editId, payload).subscribe({
      next: () => {
        this.showEditModal = false;
        this.submittingEdit = false;
        this.refreshNeeded.emit();
      },
      error: (err) => {
        console.error('Error al actualizar comodato:', err);
        this.submittingEdit = false;
      },
    });
  }

  // ── Devolución ──

  openDevolucion(com: ComodatoItem): void {
    this.comodatoToDevolver = com;
    this.submittingDevolucion = false;
    this.showDevolucionModal = true;
  }

  closeDevolucion(): void {
    this.showDevolucionModal = false;
    this.comodatoToDevolver = null;
  }

  confirmDevolucion(): void {
    const com = this.comodatoToDevolver;
    if (!com) return;
    this.submittingDevolucion = true;
    const today = new Date().toISOString().split('T')[0];
    this.api.updateComodato(com.idComodato, {
      id_paciente: com.idPaciente,
      id_equipo: com.idEquipo,
      fecha_prestamo: com.fechaPrestamo ? com.fechaPrestamo.substring(0, 10) : today,
      fecha_devolucion: today,
      estatus: 'DEVUELTO',
      monto_total: com.montoTotal,
      monto_pagado: com.montoPagado,
      saldo_pendiente: com.saldoPendiente,
      exento_pago: com.exentoPago,
      notas: com.notas || null,
    }).subscribe({
      next: () => {
        this.submittingDevolucion = false;
        this.closeDevolucion();
        this.refreshNeeded.emit();
      },
      error: (err) => {
        console.error('Error al registrar devolución:', err);
        this.submittingDevolucion = false;
      },
    });
  }

  // ── Print / PDF ──

  printComodato(com: ComodatoItem): void {
    this.printRequested.emit(com);
  }

  descargarContrato(com: ComodatoItem): void {
    this.api.exportarContratoComodatoPdf(com.idComodato).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contrato_${com.folioComodato}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 150);
      },
      error: () => alert('Error al generar contrato de comodato'),
    });
  }

  private _emptyForm() {
    return {
      id_paciente: null as number | null,
      id_equipo: null as number | null,
      fecha_prestamo: '',
      fecha_devolucion: null as string | null,
      estatus: 'PRESTADO',
      monto_total: 0,
      monto_pagado: 0,
      saldo_pendiente: 0,
      exento_pago: 'N',
      notas: '',
    };
  }
}
