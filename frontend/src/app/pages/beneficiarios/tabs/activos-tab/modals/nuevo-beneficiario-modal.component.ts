import { Component, DestroyRef, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

  // ── Date picker helpers (3 selects: día / mes / año) ──────────────────────
  readonly mesesNombres = [
    { val: '01', label: 'Enero' }, { val: '02', label: 'Febrero' },
    { val: '03', label: 'Marzo' }, { val: '04', label: 'Abril' },
    { val: '05', label: 'Mayo' }, { val: '06', label: 'Junio' },
    { val: '07', label: 'Julio' }, { val: '08', label: 'Agosto' },
    { val: '09', label: 'Septiembre' }, { val: '10', label: 'Octubre' },
    { val: '11', label: 'Noviembre' }, { val: '12', label: 'Diciembre' },
  ];
  readonly diasDisponibles = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  readonly aniosDisponibles = Array.from({ length: new Date().getFullYear() - 1920 + 1 }, (_, i) => String(new Date().getFullYear() - i));

  private fechaNacAnioValue = '';
  private fechaNacMesValue = '';
  private fechaNacDiaValue = '';

  get fechaNacDia(): string { return this.fechaNacDiaValue; }
  set fechaNacDia(v: string) { this.fechaNacDiaValue = v; this._setFechaNac(); }

  get fechaNacMes(): string { return this.fechaNacMesValue; }
  set fechaNacMes(v: string) { this.fechaNacMesValue = v; this._setFechaNac(); }

  get fechaNacAnio(): string { return this.fechaNacAnioValue; }
  set fechaNacAnio(v: string) { this.fechaNacAnioValue = v; this._setFechaNac(); }

  private _setFechaNac(): void {
    if (this.fechaNacAnioValue && this.fechaNacMesValue && this.fechaNacDiaValue) {
      this.formData.fecha_nacimiento = `${this.fechaNacAnioValue}-${this.fechaNacMesValue}-${this.fechaNacDiaValue}`;
      return;
    }
    this.formData.fecha_nacimiento = '';
  }
  // ──────────────────────────────────────────────────────────────────────────

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

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getTiposEspina()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.tiposEspinaCatalogo = data || []; },
        error: () => {},
      });
    this.api.getTiposDocumentoPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    const file = input.files?.length ? input.files[0] : null;
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
    const faltantes = this.getCamposObligatoriosFaltantes();
    if (faltantes.length > 0) {
      this.nuevoError = `Completa los campos obligatorios: ${faltantes.join(', ')}.`;
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
    const documentosIncompletos = this.nuevoBeneficiarioDocumentos.some(d =>
      (d.id_tipo_documento > 0 && !d.archivo) || (d.id_tipo_documento === 0 && !!d.archivo)
    );
    if (documentosIncompletos) {
      this.submittingNuevo = false;
      this.nuevoError = 'Completa el tipo y archivo de cada documento, o elimina la fila incompleta.';
      return;
    }
    const documentosValidos = this.nuevoBeneficiarioDocumentos.filter(d => d.id_tipo_documento > 0 && !!d.archivo);
    this.api.createBeneficiario(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created: { id_paciente?: number }) => {
          const idPacienteCreado = created?.id_paciente;
          if (documentosValidos.length > 0 && idPacienteCreado) {
            const uploads = documentosValidos.map(doc =>
              this.api.uploadDocumento(idPacienteCreado, doc.id_tipo_documento, doc.archivo as File)
            );
            forkJoin(uploads).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.fechaNacAnioValue = '';
    this.fechaNacMesValue = '';
    this.fechaNacDiaValue = '';
    this.nuevoBeneficiarioDocumentos = [{ id_tipo_documento: 0, archivo: null }];
    this.creado.emit();
  }

  private getCamposObligatoriosFaltantes(): string[] {
    const campos: Array<[string, string]> = [
      ['nombre', 'Nombre'],
      ['apellido_paterno', 'Apellido paterno'],
      ['genero', 'Genero'],
      ['fecha_nacimiento', 'Fecha de nacimiento'],
      ['curp', 'CURP'],
      ['membresia_estatus', 'Estatus de membresia'],
    ];
    return campos
      .filter(([key]) => !String(this.formData[key as keyof BeneficiarioFormData] ?? '').trim())
      .map(([, label]) => label);
  }

  private emptyForm(): BeneficiarioFormData {
    return {
      nombre: '', apellido_paterno: '', apellido_materno: '', genero: '',
      fecha_nacimiento: '', curp: '', nombre_padre_madre: '', direccion: '',
      colonia: '', ciudad: '', estado: '', codigo_postal: '', telefono_casa: '',
      telefono_celular: '', correo_electronico: '', en_emergencia_avisar_a: '',
      telefono_emergencia: '', tipo_sangre: '', usa_valvula: 'N', tipo_cuota: 'POR DEFINIR', membresia_estatus: '',
    };
  }
}
