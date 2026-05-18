import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AutoGrowDirective } from '../../../../shared/directives/auto-grow.directive';
import { ComodatoItem, ProductoItem, TableSortState, sortRows } from '../../almacen.models';

@Component({
  selector: 'app-comodatos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoGrowDirective],
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
  beneficiariosList: { id: number; nombre: string }[] = [];
  submittingNuevo = false;

  // Edit comodato
  showEditModal = false;
  editId = 0;
  editForm: any = {};
  submittingEdit = false;

  // Confirm devolución
  showDevolucionModal = false;
  comodatoToDevolver: ComodatoItem | null = null;
  submittingDevolucion = false;

  constructor(private api: ApiService) {}

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
    const base = !this.search.trim()
      ? this.comodatos
      : this.comodatos.filter(c => {
          const q = this.search.toLowerCase();
          return c.nombrePaciente.toLowerCase().includes(q)
            || c.folioComodato.toLowerCase().includes(q)
            || c.nombreEquipo.toLowerCase().includes(q);
        });

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

  openNuevo(): void {
    this.comodatoForm = this._emptyForm();
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiariosList = data.map((b: any) => ({
          id: b.id_paciente ?? b.id,
          nombre: `${b.nombre ?? ''} ${b.apellido_paterno ?? ''} ${b.apellido_materno ?? ''}`.trim()
            || b.nombre_completo || `Paciente ${b.folio}`,
        }));
      },
      error: (err) => console.error('Error loading beneficiarios:', err),
    });
    this.showNuevoModal = true;
  }

  closeNuevo(): void { this.showNuevoModal = false; }

  submitNuevo(): void {
    if (!this.comodatoForm.id_paciente || !this.comodatoForm.id_equipo || !this.comodatoForm.fecha_prestamo) return;
    this.submittingNuevo = true;
    const payload: any = { ...this.comodatoForm };
    if (!payload.fecha_devolucion) payload.fecha_devolucion = null;

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
        document.body.removeChild(link);
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
      fecha_devolucion: '',
      estatus: 'PRESTADO',
      monto_total: 0,
      monto_pagado: 0,
      saldo_pendiente: 0,
      exento_pago: 'N',
      notas: '',
    };
  }
}
