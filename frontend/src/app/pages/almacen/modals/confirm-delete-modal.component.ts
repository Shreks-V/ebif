import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-delete-modal.component.html',
})
export class ConfirmDeleteModalComponent {
  @Input() item: { id: number; nombre: string; categoria: string } | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() eliminado = new EventEmitter<void>();

  submitting = false;

  constructor(
    private readonly api: ApiService,
    private readonly toast: ToastService,
  ) {}

  confirmar(): void {
    if (!this.item) return;
    this.submitting = true;
    const isServicio = this.item.categoria === 'SERVICIO';
    const obs = isServicio
      ? this.api.deleteServicio(this.item.id)
      : this.api.deleteProducto(this.item.id);

    obs.subscribe({
      next: () => { this.submitting = false; this.eliminado.emit(); },
      error: (err) => {
        this.toast.show(err?.error?.detail || 'No se pudo eliminar el elemento seleccionado.', 'error');
        this.submitting = false;
      },
    });
  }
}
