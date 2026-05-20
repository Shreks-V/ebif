import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';
import { getMunicipiosParaEstado } from '../../../../../shared/data/mexico-municipios';
import { PAISES } from '../../../../../shared/data/paises';
import { Beneficiario, BeneficiarioEditFormData, TipoDocumento, TipoEspinaCatalogo } from '../activos-tab.types';
import { getApiError } from '../../../../../shared/utils/error.utils';

@Component({
  selector: 'app-editar-beneficiario-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-beneficiario-modal.component.html',
})
export class EditarBeneficiarioModalComponent implements OnChanges {
  @Input() beneficiario: Beneficiario | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();
  @Output() fotoActualizada = new EventEmitter<{ idPaciente: number; fotoUrl: string }>();

  editFormData: BeneficiarioEditFormData | null = null;
  editFormDataPais = 'México';
  editFormDataUsaValvula = false;
  editFormDataTiposEspina: number[] = [];
  submittingEdit = false;
  editError = '';
  editFotoFile: File | null = null;
  editFotoPreviewUrl: string | null = null;
  editStep = 1;
  readonly editSteps = ['Datos Personales', 'Dirección', 'Contacto', 'Info. Médica', 'Membresía'];

  tiposEspinaCatalogo: TipoEspinaCatalogo[] = [];
  tiposDocumentoCatalogo: TipoDocumento[] = [];

  readonly estadosMexicanos = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima', 'Durango',
    'Estado de Mexico', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'Michoacan', 'Morelos', 'Nayarit', 'Nuevo Leon', 'Oaxaca',
    'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
    'Yucatan', 'Zacatecas',
  ];
  readonly paises = PAISES;
  readonly tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  private readonly CURP_REGEX = /^[A-Z][AEIOU][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;

  getMunicipiosParaEstado(estado: string): readonly string[] {
    return getMunicipiosParaEstado(estado);
  }

  constructor(private readonly api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['beneficiario'] && this.beneficiario) {
      const b = this.beneficiario;
      this.editFormData = {
        nombre: b.nombre, apellido_paterno: b.apellidoPaterno, apellido_materno: b.apellidoMaterno || '',
        genero: b.genero, fecha_nacimiento: b.fechaNacimiento ? b.fechaNacimiento.split('T')[0] : '',
        curp: b.curp, nombre_padre_madre: b.nombrePadreMadre || '', direccion: b.direccion || '',
        colonia: b.colonia || '', ciudad: b.ciudad || '', estado: b.estado || '',
        codigo_postal: b.codigoPostal || '', telefono_casa: b.telefonoCasa || '',
        telefono_celular: b.telefonoCelular || '', correo_electronico: b.correoElectronico || '',
        en_emergencia_avisar_a: b.enEmergenciaAvisarA || '', telefono_emergencia: b.telefonoEmergencia || '',
        tipo_sangre: b.tipoSangre || '', notas_adicionales: b.notasAdicionales || '',
        membresia_estatus: b.membresiaEstatus || 'ACTIVO', tipo_cuota: b.tipoCuota || 'CUOTA A',
      };
      this.editFormDataPais = 'México';
      this.editFormDataUsaValvula = b.usaValvula === 'S';
      this.editFormDataTiposEspina = (b.tiposEspina || []).map(te => te.idTipoEspina);
      this.editFotoFile = null;
      this.editFotoPreviewUrl = b.fotoUrl || null;
      this.editError = '';
      this.editStep = 1;
      this.loadCatalogs();
    }
  }

  private loadCatalogs(): void {
    if (this.tiposEspinaCatalogo.length === 0) {
      this.api.getTiposEspina().subscribe({
        next: (data) => { this.tiposEspinaCatalogo = data || []; },
        error: () => {},
      });
    }
    if (this.tiposDocumentoCatalogo.length === 0) {
      this.api.getTiposDocumentoPublic().subscribe({
        next: (data) => { this.tiposDocumentoCatalogo = data || []; },
        error: () => {},
      });
    }
  }

  editNextStep(): void {
    if (!this.editFormData) return;
    if (this.editStep === 1) {
      if (!this.editFormData.nombre || !this.editFormData.apellido_paterno ||
          !this.editFormData.fecha_nacimiento || !this.editFormData.genero || !this.editFormData.curp) {
        this.editError = 'Completa los campos obligatorios (*)';
        return;
      }
    }
    this.editError = '';
    if (this.editStep < this.editSteps.length) this.editStep++;
  }

  editPrevStep(): void {
    this.editError = '';
    if (this.editStep > 1) this.editStep--;
  }

  onFotoBeneficiarioSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.length ? input.files[0] : null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.editError = 'Selecciona un archivo de imagen valido.';
      (input as HTMLInputElement).value = ''; // NOSONAR: typescript:S4325
      return;
    }
    this.editError = '';
    this.editFotoFile = file;
    if (this.editFotoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.editFotoPreviewUrl);
    this.editFotoPreviewUrl = URL.createObjectURL(file);
  }

  isEditEspinaSelected(id: number): boolean { return this.editFormDataTiposEspina.includes(id); }

  toggleEditEspina(id: number): void {
    const idx = this.editFormDataTiposEspina.indexOf(id);
    if (idx >= 0) this.editFormDataTiposEspina.splice(idx, 1);
    else this.editFormDataTiposEspina.push(id);
  }

  guardarEdicionBeneficiario(): void {
    if (!this.editFormData || !this.beneficiario) return;
    if (!this.editFormData.nombre || !this.editFormData.apellido_paterno || !this.editFormData.genero ||
        !this.editFormData.fecha_nacimiento || !this.editFormData.curp) {
      this.editError = 'Por favor completa todos los campos obligatorios.';
      return;
    }
    const curp = this.editFormData.curp.trim().toUpperCase();
    if (!this.CURP_REGEX.test(curp)) {
      this.editError = 'El CURP debe tener 18 caracteres con formato oficial. Ejemplo: GAGJ850116HBSRPN09.';
      return;
    }
    this.editFormData.curp = curp;
    this.submittingEdit = true;
    this.editError = '';
    const payload = {
      ...this.editFormData,
      usa_valvula: this.editFormDataUsaValvula ? 'S' : 'N',
      tipos_espina: this.editFormDataTiposEspina,
    };
    this.api.updateBeneficiario(this.beneficiario.folio, payload).subscribe({
      next: () => {
        if (!this.editFotoFile) { this.finalizarEdicion(); return; }
        const tipoDocFoto = this.getTipoDocumentoFotoUploadId();
        if (!tipoDocFoto) {
          this.submittingEdit = false;
          this.editError = 'No se pudo preparar la carga de la foto. Recarga la página e intenta nuevamente.';
          return;
        }
        this.api.uploadDocumento(this.beneficiario!.idPaciente, tipoDocFoto, this.editFotoFile).subscribe({
          next: (resp: { id_documento?: number }) => {
            const idDocumento = Number(resp?.id_documento || 0);
            if (idDocumento > 0) {
              this.fotoActualizada.emit({
                idPaciente: this.beneficiario!.idPaciente,
                fotoUrl: this.api.getDocumentoArchivoUrl(this.beneficiario!.idPaciente, idDocumento),
              });
            }
            this.finalizarEdicion();
          },
          error: (err: unknown) => {
            this.submittingEdit = false;
            this.editError = getApiError(err, 'Los datos se guardaron, pero no se pudo cargar la foto.');
            console.error('Error uploading photo:', err);
            this.guardado.emit();
          },
        });
      },
      error: (err: unknown) => {
        this.submittingEdit = false;
        this.editError = getApiError(err, 'Error al actualizar el beneficiario.');
        console.error('Error updating beneficiario:', err);
      },
    });
  }

  private finalizarEdicion(): void {
    this.submittingEdit = false;
    if (this.editFotoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.editFotoPreviewUrl);
    this.editFotoFile = null;
    this.editFotoPreviewUrl = null;
    this.guardado.emit();
  }

  private getTipoDocumentoFotoUploadId(): number {
    const tipo = this.tiposDocumentoCatalogo.find((item: TipoDocumento) => {
      const texto = `${String(item?.nombre || '').toLowerCase()} ${String(item?.descripcion || '').toLowerCase()}`;
      return texto.includes('foto') || texto.includes('fotografia') || texto.includes('imagen');
    });
    const id = Number(tipo?.id_tipo_documento || 0);
    if (Number.isFinite(id) && id > 0) return id;
    const fallback = Number(this.tiposDocumentoCatalogo?.[0]?.id_tipo_documento || 0);
    return Number.isFinite(fallback) ? fallback : 0;
  }
}
