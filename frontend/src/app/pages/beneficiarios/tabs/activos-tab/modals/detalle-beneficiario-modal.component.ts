import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../../services/api.service';
import { CuotaBadgeComponent } from '../../../../../shared/components/cuota-badge/cuota-badge.component';
import { AvatarInicialesComponent } from '../../../../../shared/components/avatar-iniciales/avatar-iniciales.component';
import { Beneficiario, CobroResumen, Documento } from '../activos-tab.types';
import { esImagen, getMembresiaBadgeClass, getMembresiaVencimientoClass } from '../activos-tab.utils';

@Component({
  selector: 'app-detalle-beneficiario-modal',
  standalone: true,
  imports: [CommonModule, CuotaBadgeComponent, AvatarInicialesComponent],
  templateUrl: './detalle-beneficiario-modal.component.html',
})
export class DetalleBeneficiarioModalComponent implements OnChanges {
  @Input() beneficiario: Beneficiario | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() editarRequest = new EventEmitter<Beneficiario>();
  @Output() historialRequest = new EventEmitter<Beneficiario>();
  @Output() credencialRequest = new EventEmitter<Beneficiario>();

  detalleTab: 'datos' | 'contacto' | 'medico' | 'cobros' | 'documentos' = 'datos';
  detalleDocumentos: Documento[] = [];
  detalleDocumentosLoading = false;
  detalleCobros: CobroResumen[] = [];
  detalleCobrosLoading = false;

  readonly esImagen = esImagen;
  readonly getMembresiaBadgeClass = getMembresiaBadgeClass;
  readonly getMembresiaVencimientoClass = getMembresiaVencimientoClass;

  constructor(private readonly api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['beneficiario'] && this.beneficiario) {
      this.detalleTab = 'datos';
      this.detalleDocumentos = [];
      this.detalleCobros = [];
      this.detalleDocumentosLoading = true;
      this.detalleCobrosLoading = true;
      this.api.getDocumentos(this.beneficiario.idPaciente).subscribe({
        next: (docs) => { this.detalleDocumentos = docs; this.detalleDocumentosLoading = false; },
        error: () => { this.detalleDocumentosLoading = false; },
      });
      this.api.getRecibos({ id_paciente: this.beneficiario.idPaciente }).subscribe({
        next: (cobros) => { this.detalleCobros = cobros || []; this.detalleCobrosLoading = false; },
        error: () => { this.detalleCobrosLoading = false; },
      });
    }
  }

  get detalleCobrosTotal(): number {
    return this.detalleCobros
      .filter(c => c.cancelada !== 'S')
      .reduce((sum, c) => sum + (Number(c.monto_total) || 0), 0);
  }

  descargarDocumento(doc: Documento): void {
    if (!this.beneficiario) return;
    this.api.getDocumentoBlob(this.beneficiario.idPaciente, doc.id_documento).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = doc.nombre_archivo || `documento_${doc.id_documento}`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('No se pudo descargar el documento.'),
    });
  }

  descargarExpediente(): void {
    if (!this.beneficiario) return;
    this.api.exportarBeneficiarioPdf(this.beneficiario.folio).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => alert('Error al generar expediente'),
    });
  }
}
