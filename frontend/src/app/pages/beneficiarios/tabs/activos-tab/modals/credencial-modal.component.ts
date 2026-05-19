import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../../services/api.service';
import { Beneficiario } from '../activos-tab.types';

@Component({
  selector: 'app-credencial-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './credencial-modal.component.html',
})
export class CredencialModalComponent {
  @Input() beneficiario: Beneficiario | null = null;
  @Output() closed = new EventEmitter<void>();

  constructor(private api: ApiService) {}

  get padecimiento(): string {
    const tipos = this.beneficiario?.tiposEspina;
    if (!tipos || tipos.length === 0) return '-';
    return tipos.map(t => t.nombre).join(', ');
  }

  descargar(): void {
    if (!this.beneficiario) return;
    this.api.exportarCredencialPdf(this.beneficiario.folio).subscribe({
      next: (blob) => this.abrirPdfEnNuevaTab(blob, `credencial_${this.beneficiario!.folio}.pdf`),
      error: () => alert('Error al generar credencial'),
    });
  }

  descargarExpediente(): void {
    if (!this.beneficiario) return;
    this.api.exportarBeneficiarioPdf(this.beneficiario.folio).subscribe({
      next: (blob) => this.abrirPdfEnNuevaTab(blob, `expediente_${this.beneficiario!.folio}.pdf`),
      error: () => alert('Error al generar expediente'),
    });
  }

  private abrirPdfEnNuevaTab(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
