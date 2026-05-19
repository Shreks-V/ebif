import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';
import { getMunicipiosParaEstado } from '../../../../../shared/data/mexico-municipios';
import { PAISES } from '../../../../../shared/data/paises';
import { BeneficiarioFormData, NuevoBeneficiarioDocumento, TipoDocumento, TipoEspinaCatalogo } from '../activos-tab.types';
import { getApiError } from '../../../../../shared/utils/error.utils';

@Component({
  selector: 'app-nuevo-beneficiario-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nuevo-beneficiario-modal.component.html',
})
export class NuevoBeneficiarioModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() creado = new EventEmitter<void>();

  formData: BeneficiarioFormData = this.emptyForm();
  formDataPais = 'México';
  formDataUsaValvula = false;
  formDataTiposEspina: number[] = [];
  nuevoBeneficiarioDocumentos: NuevoBeneficiarioDocumento[] = [{ id_tipo_documento: 0, archivo: null }];
  tiposDocumentoCatalogo: TipoDocumento[] = [];
  tiposEspinaCatalogo: TipoEspinaCatalogo[] = [];
  submittingNuevo = false;
  nuevoError = '';

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
  private readonly CURP_REGEX = /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;

  getMunicipiosParaEstado(estado: string): readonly string[] {
    return getMunicipiosParaEstado(estado);
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getTiposEspina().subscribe({
      next: (data) => { this.tiposEspinaCatalogo = data || []; },
      error: () => {},
    });
    this.api.getTiposDocumentoPublic().subscribe({
      next: (data) => { this.tiposDocumentoCatalogo = data || []; },
      error: () => {},
    });
  }

  agregarDocumentoNuevoBeneficiario(): void {
    this.nuevoBeneficiarioDocumentos.push({ id_tipo_documento: 0, archivo: null });
  }

  eliminarDocumentoNuevoBeneficiario(index: number): void {
    if (this.nuevoBeneficiarioDocumentos.length === 1) {
      this.nuevoBeneficiarioDocumentos[0] = { id_tipo_documento: 0, archivo: null };
      return;
    }
    this.nuevoBeneficiarioDocumentos.splice(index, 1);
  }

  onNuevoBeneficiarioDocSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (this.nuevoBeneficiarioDocumentos[index]) {
      this.nuevoBeneficiarioDocumentos[index].archivo = file;
    }
  }

  isNuevoEspinaSelected(id: number): boolean { return this.formDataTiposEspina.includes(id); }

  toggleNuevoEspina(id: number): void {
    const idx = this.formDataTiposEspina.indexOf(id);
    if (idx >= 0) this.formDataTiposEspina.splice(idx, 1);
    else this.formDataTiposEspina.push(id);
  }

  submitNuevoBeneficiario(): void {
    if (!this.formData.nombre || !this.formData.apellido_paterno || !this.formData.genero ||
        !this.formData.fecha_nacimiento || !this.formData.curp || !this.formData.tipo_cuota ||
        !this.formData.membresia_estatus) {
      this.nuevoError = 'Por favor completa todos los campos obligatorios marcados con *.';
      return;
    }
    const curp = this.formData.curp.trim().toUpperCase();
    if (!this.CURP_REGEX.test(curp)) {
      this.nuevoError = 'El CURP debe tener 18 caracteres con formato oficial. Ejemplo: GAGJ850116HBSRPN09.';
      return;
    }
    this.formData.curp = curp;
    this.submittingNuevo = true;
    this.nuevoError = '';
    const payload = {
      ...this.formData,
      usa_valvula: this.formDataUsaValvula ? 'S' : 'N',
      tipos_espina: this.formDataTiposEspina,
    };
    const documentosValidos = this.nuevoBeneficiarioDocumentos.filter(d => d.id_tipo_documento > 0 && !!d.archivo);
    this.api.createBeneficiario(payload).subscribe({
      next: (created: { id_paciente?: number }) => {
        const idPacienteCreado = created?.id_paciente;
        if (documentosValidos.length > 0 && idPacienteCreado) {
          const uploads = documentosValidos.map(doc =>
            this.api.uploadDocumento(idPacienteCreado, doc.id_tipo_documento, doc.archivo as File)
          );
          forkJoin(uploads).subscribe({
            next: () => this.finalizar(),
            error: (err) => {
              console.error('Beneficiario creado, pero hubo error al subir documentos:', err);
              this.finalizar();
              alert('El beneficiario se creo correctamente, pero algunos documentos no se pudieron subir.');
            },
          });
          return;
        }
        this.finalizar();
      },
      error: (err: unknown) => {
        this.submittingNuevo = false;
        this.nuevoError = getApiError(err, 'Error al crear el beneficiario. Intenta de nuevo.');
        console.error('Error creating beneficiario:', err);
      },
    });
  }

  private finalizar(): void {
    this.submittingNuevo = false;
    this.formData = this.emptyForm();
    this.formDataPais = 'México';
    this.formDataUsaValvula = false;
    this.formDataTiposEspina = [];
    this.nuevoBeneficiarioDocumentos = [{ id_tipo_documento: 0, archivo: null }];
    this.creado.emit();
  }

  private emptyForm(): BeneficiarioFormData {
    return {
      nombre: '', apellido_paterno: '', apellido_materno: '', genero: '',
      fecha_nacimiento: '', curp: '', nombre_padre_madre: '', direccion: '',
      colonia: '', ciudad: '', estado: '', codigo_postal: '', telefono_casa: '',
      telefono_celular: '', correo_electronico: '', en_emergencia_avisar_a: '',
      telefono_emergencia: '', tipo_sangre: '', usa_valvula: 'N', tipo_cuota: '', membresia_estatus: '',
    };
  }
}
