import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

export interface BeneficiarioSeleccionado {
  id: number;
  folio: string;
  nombre: string;
  tipoCuota: string;
}

@Component({
  selector: 'app-beneficiario-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './beneficiario-combobox.component.html',
})
export class BeneficiarioComboboxComponent implements OnInit {
  /** HTML id forwarded to the inner <input> so parent <label for="..."> works. */
  @Input() inputId = 'beneficiario-combobox';
  @Input() placeholder = 'Buscar por nombre o folio...';
  /** Pre-fills the combobox without triggering the (seleccionado) event. */
  @Input() initialValue: BeneficiarioSeleccionado | null = null;
  /** Emits the selected beneficiary, or null when the field is cleared. */
  @Output() seleccionado = new EventEmitter<BeneficiarioSeleccionado | null>();

  busqueda = '';
  selectedId: number | null = null;
  showDropdown = false;
  all: BeneficiarioSeleccionado[] = [];
  filtrados: BeneficiarioSeleccionado[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    if (this.initialValue) {
      this.selectedId = this.initialValue.id;
      this.busqueda = `${this.initialValue.folio} - ${this.initialValue.nombre}`;
    }

    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.all = data.map((b) => ({
          id: b.id_paciente ?? 0,
          folio: b.folio_paciente ?? b.folio ?? '',
          nombre: b.nombre_completo ??
            `${b.nombre ?? ''} ${b.apellido_paterno ?? ''} ${b.apellido_materno ?? ''}`.trim(),
          tipoCuota: b.tipo_cuota || 'A',
        }));
      },
      error: (err) => console.error('Error al cargar beneficiarios:', err),
    });
  }

  filtrar(): void {
    const q = this.busqueda.toLowerCase().trim();
    this.selectedId = null;
    this.seleccionado.emit(null);
    this.filtrados = q
      ? this.all.filter(b =>
          b.nombre.toLowerCase().includes(q) || b.folio.toLowerCase().includes(q)
        ).slice(0, 20)
      : this.all.slice(0, 10);
    this.showDropdown = true;
  }

  onFocus(): void {
    const q = this.busqueda.toLowerCase().trim();
    this.filtrados = q
      ? this.all.filter(b =>
          b.nombre.toLowerCase().includes(q) || b.folio.toLowerCase().includes(q)
        ).slice(0, 20)
      : this.all.slice(0, 10);
    this.showDropdown = true;
  }

  onBlur(): void {
    setTimeout(() => { this.showDropdown = false; }, 200);
  }

  seleccionar(b: BeneficiarioSeleccionado): void {
    this.selectedId = b.id;
    this.busqueda = `${b.folio} - ${b.nombre}`;
    this.showDropdown = false;
    this.seleccionado.emit(b);
  }

  limpiar(): void {
    this.selectedId = null;
    this.busqueda = '';
    this.filtrados = this.all.slice(0, 10);
    this.seleccionado.emit(null);
  }
}
