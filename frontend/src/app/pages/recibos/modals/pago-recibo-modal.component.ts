import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { getApiError } from '../../../shared/utils/error.utils';

@Component({
  selector: 'app-pago-recibo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pago-recibo-modal.component.html',
})
export class PagoReciboModalComponent implements OnChanges {
  @Input() recibo: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() pagado = new EventEmitter<any>();

  tipo: 'abono' | 'liquidar' | 'exentar' = 'abono';
  monto = 0;
  metodo = 0;
  nota = '';
  error = '';
  guardando = false;
  metodosCatalogo: { id: number; nombre: string }[] = [];

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recibo'] && this.recibo) {
      this.tipo = 'abono';
      this.monto = 0;
      this.nota = '';
      this.error = '';
      this.guardando = false;
      if (this.metodosCatalogo.length === 0) {
        this.api.getMetodosPago().subscribe({
          next: (data) => {
            this.metodosCatalogo = data.map((m) => ({ id: m.id_metodo_pago ?? 0, nombre: m.nombre }));
            this.metodo = this.metodosCatalogo[0]?.id || 0;
          },
        });
      } else {
        this.metodo = this.metodosCatalogo[0]?.id || 0;
      }
    }
  }

  selectTipo(t: 'abono' | 'liquidar' | 'exentar'): void {
    this.tipo = t;
    this.error = '';
    this.monto = t === 'liquidar' ? (this.recibo?.saldoPendiente ?? 0) : 0;
  }

  guardar(): void {
    if (!this.recibo) return;
    this.error = '';

    if (this.tipo === 'exentar') {
      this.guardando = true;
      this.api.exentarVenta(this.recibo.idVenta, this.nota || undefined).subscribe({
        next: (updated) => { this.guardando = false; this.pagado.emit(updated); },
        error: (err: unknown) => { this.guardando = false; this.error = getApiError(err, 'Error al exentar la venta.'); },
      });
      return;
    }

    if (!this.metodo) { this.error = 'Selecciona un método de pago.'; return; }
    if (!this.monto || this.monto <= 0) { this.error = 'Ingresa un monto válido.'; return; }
    if (this.monto > (this.recibo.saldoPendiente || 0)) { this.error = 'El monto no puede superar el saldo pendiente.'; return; }

    this.guardando = true;
    this.api.registrarPagoParcial(this.recibo.idVenta, { id_metodo_pago: this.metodo, monto: this.monto }).subscribe({
      next: (updated) => { this.guardando = false; this.pagado.emit(updated); },
      error: (err: unknown) => { this.guardando = false; this.error = getApiError(err, 'Error al registrar el pago.'); },
    });
  }
}
