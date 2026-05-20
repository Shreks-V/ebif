import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Documento } from '../../shared/models/preregistro.models';
import { getMunicipiosParaEstado } from '../../shared/data/mexico-municipios';
import { PAISES } from '../../shared/data/paises';

const CURP_REGEX = /^[A-Z][AEIOU][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;

interface DocumentoPendiente {
  id: number;
  tipoId: number;
  file: File | null;
}

interface PreRegistroFormData {
  nombre: string; apellidoPaterno: string; apellidoMaterno: string;
  fechaNacimiento: string; sexo: string; curp: string; nombrePadreMadre: string;
  pais: string; calle: string; numeroExterior: string; numeroInterior: string;
  colonia: string; municipio: string; ciudad: string; estado: string; codigoPostal: string;
  telefonoCasaCodigo: string; telefonoCasa: string;
  telefonoCelularCodigo: string; telefonoCelular: string;
  correoElectronico: string; enEmergenciaAvisarA: string;
  telefonoEmergenciaCodigo: string; telefonoEmergencia: string;
  requiereTutor: boolean; nombreTutor: string;
  telefonoTutorCodigo: string; telefonoTutor: string; relacionTutor: string;
  tipoSangre: string; usaValvula: boolean;
  tiposEspinaIds: number[];
  alergias: string; medicamentosActuales: string; notasAdicionales: string;
}

interface PreRegistroCreatedResponse { id_paciente?: number; preregistro_token?: string; }

@Component({
  selector: 'app-pre-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pre-registro.component.html',
  styles: []
})
export class PreRegistroComponent implements OnInit {
  router = inject(Router);
  private readonly api = inject(ApiService);
  currentStep = 1;
  submitted = false;
  submitting = false;
  fotografiaName = '';
  fotografiaFile: File | null = null;
  fotografiaPreview: string | null = null;
  stepError = '';
  validationAttempted = false;
  invalidFields: string[] = [];
  fieldErrors: { [key: string]: string } = {};
  checkingCurp = false;
  curpDisponible: boolean | null = null;

  // Created paciente ID (for document upload in step 5)
  createdPacienteId: number | null = null;

  steps = ['Datos Personales', 'Direcci\u00f3n', 'Contacto', 'Info. M\u00e9dica', 'Documentos'];

  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  readonly paises = PAISES;

  readonly paisesTelefono = [
    { bandera: '🇲🇽', nombre: 'México',         codigo: '+52'  },
    { bandera: '🇺🇸', nombre: 'Estados Unidos',  codigo: '+1'   },
    { bandera: '🇨🇦', nombre: 'Canadá',          codigo: '+1'   },
    { bandera: '🇪🇸', nombre: 'España',           codigo: '+34'  },
    { bandera: '🇦🇷', nombre: 'Argentina',        codigo: '+54'  },
    { bandera: '🇨🇴', nombre: 'Colombia',         codigo: '+57'  },
    { bandera: '🇬🇹', nombre: 'Guatemala',        codigo: '+502' },
    { bandera: '🇭🇳', nombre: 'Honduras',         codigo: '+504' },
    { bandera: '🇸🇻', nombre: 'El Salvador',      codigo: '+503' },
    { bandera: '🇨🇷', nombre: 'Costa Rica',       codigo: '+506' },
  ];

  tiposEspinaList: { id_tipo_espina: number; nombre: string; descripcion?: string }[] = [];
  tiposDocumento: { id_tipo_documento: number; nombre: string }[] = [];

  estados = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Ciudad de M\u00e9xico', 'Coahuila', 'Colima', 'Durango', 'Estado de M\u00e9xico', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'Michoac\u00e1n', 'Morelos', 'Nayarit', 'Nuevo Le\u00f3n',
    'Oaxaca', 'Puebla', 'Quer\u00e9taro', 'Quintana Roo', 'San Luis Potos\u00ed', 'Sinaloa', 'Sonora',
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucat\u00e1n', 'Zacatecas'
  ];

  getMunicipiosParaEstado(estado: string): readonly string[] {
    return getMunicipiosParaEstado(estado);
  }

  formData: PreRegistroFormData = {
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    fechaNacimiento: '', sexo: '', curp: '', nombrePadreMadre: '',
    pais: 'México', calle: '', numeroExterior: '', numeroInterior: '',
    colonia: '', municipio: '', ciudad: '', estado: '', codigoPostal: '',
    telefonoCasaCodigo: '+52', telefonoCasa: '',
    telefonoCelularCodigo: '+52', telefonoCelular: '',
    correoElectronico: '',
    enEmergenciaAvisarA: '',
    telefonoEmergenciaCodigo: '+52', telefonoEmergencia: '',
    requiereTutor: false, nombreTutor: '',
    telefonoTutorCodigo: '+52', telefonoTutor: '', relacionTutor: '',
    tipoSangre: '', usaValvula: false,
    tiposEspinaIds: [] as number[],
    alergias: '', medicamentosActuales: '', notasAdicionales: ''
  };

  // Document upload state (raw API response includes nombre_archivo not in Documento model)
  documentosSubidos: Documento[] = [];
  documentosPendientes: DocumentoPendiente[] = [{ id: 1, tipoId: 0, file: null }];
  private siguienteDocumentoPendienteId = 2;
  subiendoDoc = false;

  // Validation rules per step
  private readonly requiredByStep: { [step: number]: string[] } = {
    1: ['nombre', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'sexo', 'curp', 'nombrePadreMadre'],
    2: ['pais', 'calle', 'numeroExterior', 'colonia', 'municipio', 'ciudad', 'estado', 'codigoPostal'],
    3: ['telefonoCelular', 'enEmergenciaAvisarA', 'telefonoEmergencia'],
    4: ['tipoSangre'],
  };

  ngOnInit(): void {
    this.api.getTiposEspinaPublic().subscribe({
      next: (data) => { this.tiposEspinaList = data; },
      error: (err) => console.error('Error cargando tipos de espina:', err),
    });
    this.api.getTiposDocumentoPublic().subscribe({
      next: (data) => { this.tiposDocumento = data; },
      error: (err) => console.error('Error cargando tipos de documento:', err),
    });
  }

  // ── Computed ───────────────────────────────────────────────
  get esMenorDeEdad(): boolean {
    if (!this.formData.fechaNacimiento) return false;
    const nac = new Date(this.formData.fechaNacimiento + 'T12:00:00');
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad < 18;
  }

  // ── Event handlers ─────────────────────────────────────────
  onFechaNacimientoChange(): void {
    if (this.esMenorDeEdad) {
      this.formData.requiereTutor = true;
    }
  }

  onCurpChange(val: string): void {
    this.formData.curp = (val || '').toUpperCase();
    this.curpDisponible = null;
    this.invalidFields = this.invalidFields.filter(f => f !== 'curp');
    delete this.fieldErrors['curp'];
  }

  onCurpBlur(): void {
    const curp = (this.formData.curp || '').trim().toUpperCase();
    if (curp.length !== 18) return;
    const curpRegex = CURP_REGEX;
    if (!curpRegex.test(curp)) return;
    this.checkingCurp = true;
    this.curpDisponible = null;
    this.api.checkCurpDisponible(curp).subscribe({
      next: (res) => {
        this.checkingCurp = false;
        this.curpDisponible = res.disponible;
        if (res.disponible) {
          this.invalidFields = this.invalidFields.filter(f => f !== 'curp');
          delete this.fieldErrors['curp'];
        } else {
          if (!this.invalidFields.includes('curp')) this.invalidFields.push('curp');
          this.fieldErrors['curp'] = 'Este CURP ya está registrado. Si ya enviaste un pre-registro, contáctanos.';
        }
      },
      error: () => { this.checkingCurp = false; },
    });
  }

  getFieldError(field: string): string {
    return this.fieldErrors[field] || '';
  }

  // ── Validators ─────────────────────────────────────────────
  private _soloLetras(s: string): boolean {
    return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/.test(s.trim());
  }

  private _soloDigitos(s: string): string {
    return (s || '').replace(/\D/g, '');
  }

  private _esTelefono(s: string, codigo: string = '+52'): boolean {
    const n = this._soloDigitos(s).length;
    return codigo === '+52' ? n === 10 : n >= 6 && n <= 15;
  }

  maxTelefono(codigo: string): number {
    return codigo === '+52' ? 10 : 15;
  }

  getFieldClass(field: string): string {
    const base = 'w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition-all';
    if (this.invalidFields.includes(field)) {
      return `${base} border-red-400 focus:border-red-500 focus:ring-red-100`;
    }
    return `${base} border-slate-200 focus:border-[#00328b] focus:ring-[#00328b]/10`;
  }

  isEspinaSelected(id: number): boolean {
    return this.formData.tiposEspinaIds.includes(id);
  }

  toggleEspina(id: number): void {
    const idx = this.formData.tiposEspinaIds.indexOf(id);
    if (idx >= 0) {
      this.formData.tiposEspinaIds.splice(idx, 1);
    } else {
      this.formData.tiposEspinaIds.push(id);
    }
  }

  validateStep(step: number): boolean {
    this.invalidFields = [];
    this.fieldErrors = {};
    this.stepError = '';
    this.validationAttempted = true;

    const formAsRecord = this.formData as unknown as Record<string, unknown>;
    for (const field of (this.requiredByStep[step] || [])) {
      const val = formAsRecord[field];
      if (!val || (typeof val === 'string' && val.trim() === '')) {
        this.invalidFields.push(field);
      }
    }

    if (step === 1) this._validateStep1Fields(formAsRecord);
    if (step === 3) this._validateStep3Fields(formAsRecord);
    if (step === 4 && this.formData.tiposEspinaIds.length === 0) {
      this.invalidFields.push('tiposEspinaIds');
    }

    if (this.invalidFields.length > 0) {
      if (!this.stepError) {
        this.stepError = 'Por favor completa todos los campos obligatorios marcados con *';
      }
      return false;
    }
    return true;
  }

  private _addFieldError(field: string, msg: string): void {
    if (!this.invalidFields.includes(field)) this.invalidFields.push(field);
    this.fieldErrors[field] = msg;
  }

  private _validateStep1Fields(formAsRecord: Record<string, unknown>): void {
    for (const f of ['nombre', 'apellidoPaterno', 'apellidoMaterno', 'nombrePadreMadre']) {
      const v = ((formAsRecord[f] as string) || '').trim();
      if (v && !this._soloLetras(v)) {
        this._addFieldError(f, 'Solo se permiten letras en este campo.');
      }
    }
    if (this.formData.curp && !CURP_REGEX.test(this.formData.curp.trim().toUpperCase())) {
      this._addFieldError('curp', 'El CURP no tiene el formato correcto (18 caracteres con el patrón oficial).');
    }
    if (this.checkingCurp) {
      if (!this.invalidFields.includes('curp')) this.invalidFields.push('curp');
      this.stepError = 'Espera a que se verifique la disponibilidad del CURP.';
      return;
    }
    if (this.curpDisponible === false) {
      this._addFieldError('curp', 'Este CURP ya está registrado. Si ya enviaste un pre-registro, contáctanos.');
    }
  }

  private _validateStep3Fields(formAsRecord: Record<string, unknown>): void {
    const phoneMsg = (codigo: unknown) => codigo === '+52'
      ? 'El teléfono debe tener exactamente 10 dígitos.'
      : 'Número de teléfono inválido.';
    for (const [f, cf] of [['telefonoCelular', 'telefonoCelularCodigo'], ['telefonoEmergencia', 'telefonoEmergenciaCodigo']] as [string, string][]) {
      if (formAsRecord[f] && !this._esTelefono(formAsRecord[f] as string, formAsRecord[cf] as string)) {
        this._addFieldError(f, phoneMsg(formAsRecord[cf]));
      }
    }
    if (this.formData.telefonoCasa && !this._esTelefono(this.formData.telefonoCasa, this.formData.telefonoCasaCodigo)) {
      this._addFieldError('telefonoCasa', phoneMsg(this.formData.telefonoCasaCodigo));
    }
    if (!this.formData.requiereTutor) return;
    for (const f of ['nombreTutor', 'telefonoTutor', 'relacionTutor']) {
      const fval = formAsRecord[f] as string;
      if (!fval || fval.trim() === '') this.invalidFields.push(f);
    }
    const nombreTutor = (this.formData.nombreTutor || '').trim();
    if (nombreTutor && !this._soloLetras(nombreTutor)) {
      this._addFieldError('nombreTutor', 'Solo se permiten letras en este campo.');
    }
    if (this.formData.telefonoTutor && !this._esTelefono(this.formData.telefonoTutor, this.formData.telefonoTutorCodigo)) {
      this._addFieldError('telefonoTutor', phoneMsg(this.formData.telefonoTutorCodigo));
    }
  }

  nextStep(): void {
    if (!this.validateStep(this.currentStep)) return;
    this.validationAttempted = false;
    this.invalidFields = [];
    this.stepError = '';

    // After step 4 (medical info), create the pre-registro first so step 5 can upload docs
    if (this.currentStep === 4 && !this.createdPacienteId) {
      this.crearPreRegistroParaDocumentos();
      return;
    }

    if (this.currentStep < 5) this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private crearPreRegistroParaDocumentos(): void {
    this.submitting = true;
    const notasParts = [];
    if (this.formData.alergias) notasParts.push(`Alergias: ${this.formData.alergias}`);
    if (this.formData.medicamentosActuales) notasParts.push(`Medicamentos: ${this.formData.medicamentosActuales}`);
    if (this.formData.notasAdicionales) notasParts.push(this.formData.notasAdicionales);

    const payload = {
      nombre: this.formData.nombre,
      apellido_paterno: this.formData.apellidoPaterno,
      apellido_materno: this.formData.apellidoMaterno,
      fecha_nacimiento: this.formData.fechaNacimiento,
      genero: this.formData.sexo,
      curp: this.formData.curp,
      estado_nacimiento: this.formData.estado,
      hospital_nacimiento: '',
      nombre_padre_madre: this.formData.nombrePadreMadre,
      direccion: [this.formData.calle, this.formData.numeroExterior, this.formData.numeroInterior].filter(Boolean).join(' '),
      colonia: this.formData.colonia,
      ciudad: this.formData.ciudad,
      estado: this.formData.estado,
      codigo_postal: this.formData.codigoPostal,
      telefono_casa: this.formData.telefonoCasa
        ? `${this.formData.telefonoCasaCodigo} ${this.formData.telefonoCasa}`
        : '',
      telefono_celular: `${this.formData.telefonoCelularCodigo} ${this.formData.telefonoCelular}`,
      correo_electronico: this.formData.correoElectronico,
      en_emergencia_avisar_a: this.formData.enEmergenciaAvisarA,
      telefono_emergencia: `${this.formData.telefonoEmergenciaCodigo} ${this.formData.telefonoEmergencia}`,
      tipo_sangre: this.formData.tipoSangre,
      usa_valvula: this.formData.usaValvula ? 'S' : 'N',
      tipo_cuota: 'CUOTA A',
      notas_adicionales: notasParts.join(' | '),
      paso_actual: 5,
      tipos_espina: this.formData.tiposEspinaIds,
    };

    this.api.createPreRegistro(payload).subscribe({
      next: (res: PreRegistroCreatedResponse) => {
        this.submitting = false;
        this.createdPacienteId = res.id_paciente ?? null;
        if (res.preregistro_token) {
          sessionStorage.setItem('preregistro_token', res.preregistro_token);
        }
        if (this.fotografiaFile) {
          const tipoFoto = this.tiposDocumento.find(t =>
            t.nombre?.toLowerCase().includes('fotograf')
          );
          if (tipoFoto) {
            this.api.uploadDocumento(res.id_paciente!, tipoFoto.id_tipo_documento, this.fotografiaFile)
              .subscribe({ error: (e) => console.error('Error al subir fotografía:', e) });
          }
        }
        this.currentStep = 5;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err: unknown) => {
        this.submitting = false;
        console.error('Error al crear pre-registro:', err);
        const detail = (err as { error?: { detail?: string } })?.error?.detail;
        if (detail?.includes('folio o CURP')) {
          this.stepError = 'Ya existe un registro con ese CURP. Si ya enviaste un pre-registro, cont\u00e1ctanos.';
        } else {
          this.stepError = detail || 'Ocurri\u00f3 un error al guardar. Intenta de nuevo.';
        }
      },
    });
  }

  prevStep(): void {
    this.stepError = '';
    this.invalidFields = [];
    this.validationAttempted = false;
    if (this.currentStep > 1) this.currentStep--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fotografiaFile = file;
      this.fotografiaName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => { this.fotografiaPreview = e.target?.result as string; };
      reader.readAsDataURL(file);
    }
  }

  quitarFotografia(): void {
    this.fotografiaFile = null;
    this.fotografiaName = '';
    this.fotografiaPreview = null;
  }

  get hayDocumentosListos(): boolean {
    return this.documentosPendientes.some((doc) => doc.tipoId !== 0 && !!doc.file);
  }

  agregarDocumentoPendiente(): void {
    this.documentosPendientes.push({
      id: this.siguienteDocumentoPendienteId++,
      tipoId: 0,
      file: null,
    });
  }

  quitarDocumentoPendiente(id: number): void {
    if (this.documentosPendientes.length === 1) return;
    this.documentosPendientes = this.documentosPendientes.filter((doc) => doc.id !== id);
  }

  onDocFileSelected(event: Event, doc: DocumentoPendiente): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      doc.file = input.files[0];
    }
    input.value = '';
  }

  subirDocumentosPendientes(): void {
    if (!this.createdPacienteId) return;
    const docsListos = this.documentosPendientes.filter((doc) => doc.tipoId !== 0 && doc.file);
    if (docsListos.length === 0) return;
    this.subiendoDoc = true;
    const uploads = docsListos.map((doc) => this.api.uploadDocumento(this.createdPacienteId!, doc.tipoId, doc.file!));
    forkJoin(uploads).subscribe({
      next: () => {
        this.subiendoDoc = false;
        this.documentosPendientes = [{ id: this.siguienteDocumentoPendienteId++, tipoId: 0, file: null }];
        this.cargarDocumentos();
      },
      error: (err) => {
        console.error('Error al subir documentos:', err);
        this.subiendoDoc = false;
      },
    });
  }

  eliminarDocumento(doc: Documento): void {
    if (!this.createdPacienteId) return;
    this.api.deleteDocumento(this.createdPacienteId, doc.id_documento).subscribe({
      next: () => this.cargarDocumentos(),
      error: (err) => console.error('Error al eliminar documento:', err),
    });
  }

  private cargarDocumentos(): void {
    if (!this.createdPacienteId) return;
    this.api.getDocumentos(this.createdPacienteId).subscribe({
      next: (data) => { this.documentosSubidos = data; },
      error: (err) => console.error('Error al cargar documentos:', err),
    });
  }

  submitForm(): void {
    // Pre-registro was already created when moving from step 4 to 5
    this.submitted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
