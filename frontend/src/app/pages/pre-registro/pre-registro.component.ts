import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { OcrApiService, OcrResult } from '../../services/ocr-api.service';
import { getMunicipiosParaEstado } from '../../shared/data/mexico-municipios';
import { PAISES } from '../../shared/data/paises';

const CURP_REGEX = /^[A-Z][AEIOU][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;

interface OcrFile {
  id: number;
  file: File;
  tipoId: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  result: OcrResult | null;
  errorMsg: string;
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
  private readonly ocrApi = inject(OcrApiService);
  private readonly destroyRef = inject(DestroyRef);

  currentStep = 1;
  submitted = false;
  submitting = false;
  stepError = '';
  validationAttempted = false;
  invalidFields: string[] = [];
  fieldErrors: { [key: string]: string } = {};
  checkingCurp = false;
  curpDisponible: boolean | null = null;

  // ── Fotografía ────────────────────────────────────────────────
  fotografiaName = '';
  fotografiaFile: File | null = null;
  fotografiaPreview: string | null = null;

  // ── OCR multi-file (paso 1) ───────────────────────────────────
  ocrFiles: OcrFile[] = [];
  ocrProcessing = false;
  ocrDone = false;
  ocrDragOver = false;
  ocrMergedCampos: string[] = [];
  private nextOcrFileId = 1;

  steps = ['Documentos', 'Datos Generales', 'Dirección', 'Contacto', 'Info. Médica'];

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
    'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
    'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora',
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
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

  // Validation rules per step (step 1 = docs/OCR — no required fields)
  private readonly requiredByStep: { [step: number]: string[] } = {
    1: [],
    2: ['nombre', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'sexo', 'curp', 'nombrePadreMadre'],
    3: ['pais', 'calle', 'numeroExterior', 'colonia', 'municipio', 'ciudad', 'estado', 'codigoPostal'],
    4: ['telefonoCelular', 'enEmergenciaAvisarA', 'telefonoEmergencia'],
    5: ['tipoSangre'],
  };

  ngOnInit(): void {
    this.api.getTiposEspinaPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => { this.tiposEspinaList = d; }, error: () => {} });
    this.api.getTiposDocumentoPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => { this.tiposDocumento = d; }, error: () => {} });
  }

  // ── Computed ───────────────────────────────────────────────────
  get esMenorDeEdad(): boolean {
    if (!this.formData.fechaNacimiento) return false;
    const nac = new Date(this.formData.fechaNacimiento + 'T12:00:00');
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad < 18;
  }

  get ocrCompletados(): number { return this.ocrFiles.filter(f => f.status === 'done').length; }
  get ocrConError(): number   { return this.ocrFiles.filter(f => f.status === 'error').length; }

  // ── OCR: step 1 ───────────────────────────────────────────────
  onDocDragOver(e: DragEvent): void { e.preventDefault(); this.ocrDragOver = true; }
  onDocDragLeave(): void { this.ocrDragOver = false; }

  onDocDrop(e: DragEvent): void {
    e.preventDefault();
    this.ocrDragOver = false;
    if (e.dataTransfer?.files) this._addFiles(Array.from(e.dataTransfer.files));
  }

  onDocFilesSelected(e: Event): void {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    (e.target as HTMLInputElement).value = '';
    this._addFiles(files);
  }

  private _addFiles(files: File[]): void {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    for (const f of files) {
      if (!allowed.includes(f.type)) continue;
      if (f.size > 10 * 1024 * 1024) continue;
      this.ocrFiles.push({ id: this.nextOcrFileId++, file: f, tipoId: 0, status: 'pending', result: null, errorMsg: '' });
    }
    this.ocrDone = false;
  }

  removeOcrFile(id: number): void {
    this.ocrFiles = this.ocrFiles.filter(f => f.id !== id);
    if (this.ocrFiles.length === 0) { this.ocrDone = false; this.ocrMergedCampos = []; }
  }

  analizarDocumentos(): void {
    const pending = this.ocrFiles.filter(f => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0 || this.ocrProcessing) return;
    this.ocrProcessing = true;
    this._runOcrNext(pending, 0);
  }

  private _runOcrNext(queue: OcrFile[], index: number): void {
    if (index >= queue.length) {
      this.ocrProcessing = false;
      this.ocrDone = true;
      this._finalizarOcr();
      return;
    }
    const item = queue[index];
    item.status = 'processing';
    this.ocrApi.extraerDocumento(item.file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { item.result = r; item.status = 'done'; this._autoSelectTipo(item); this._runOcrNext(queue, index + 1); },
        error: () => { item.status = 'error'; item.errorMsg = 'No se pudo leer este archivo'; this._runOcrNext(queue, index + 1); },
      });
  }

  private _normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  private _autoSelectTipo(item: OcrFile): void {
    if (!item.result?.tipo_documento || item.tipoId !== 0) return;
    const ocr = this._normalize(item.result.tipo_documento);
    const keywords: [string[], number][] = this.tiposDocumento.map(td => [
      [this._normalize(td.nombre)], td.id_tipo_documento,
    ]);
    // Also map common OCR labels to keywords we search in DB names
    const ocrAliases: Record<string, string[]> = {
      'curp':                    ['curp'],
      'ine':                     ['ine', 'ife', 'credencial', 'elector'],
      'ife':                     ['ine', 'ife', 'credencial', 'elector'],
      'credencial':              ['ine', 'ife', 'credencial', 'elector'],
      'acta de nacimiento':      ['acta', 'nacimiento'],
      'acta':                    ['acta', 'nacimiento'],
      'comprobante de domicilio':['comprobante', 'domicilio'],
      'comprobante':             ['comprobante', 'domicilio'],
      'pasaporte':               ['pasaporte'],
      'cartilla militar':        ['cartilla', 'militar'],
    };
    const searchTerms = ocrAliases[ocr] ?? [ocr];
    for (const td of this.tiposDocumento) {
      const dbName = this._normalize(td.nombre);
      if (searchTerms.some(t => dbName.includes(t) || t.includes(dbName))) {
        item.tipoId = td.id_tipo_documento;
        return;
      }
    }
  }

  private _finalizarOcr(): void {
    const results = this.ocrFiles.filter(f => f.result !== null).map(f => f.result!);
    if (results.length === 0) return;
    const merged = this._mergeOcrResults(results);
    this._aplicarOcr(merged);
  }

  private _mergeOcrResults(results: OcrResult[]): OcrResult {
    const base: OcrResult = {
      tipo_documento: null, nombre: null, apellido_paterno: null, apellido_materno: null,
      fecha_nacimiento: null, sexo: null, curp: null, estado_nacimiento: null,
      calle: null, numero_exterior: null, numero_interior: null, colonia: null,
      municipio: null, estado_residencia: null, codigo_postal: null,
      nombre_padre: null, nombre_madre: null, confianza: 'alta', campos_detectados: null,
    };
    const keys = Object.keys(base) as (keyof OcrResult)[];
    for (const key of keys) {
      for (const r of results) {
        if (r[key] !== null && r[key] !== undefined) {
          (base as unknown as Record<string, unknown>)[key] = r[key];
          break;
        }
      }
    }
    return base;
  }

  private _toTitleCase(s: string): string {
    return s.toLowerCase().replace(/(?:^|\s|\/|-)[a-záéíóúüñ]/g, c => c.toUpperCase());
  }

  private _aplicarOcr(r: OcrResult): void {
    const tc = (s: string | null) => s ? this._toTitleCase(s) : s;
    const campos: string[] = [];
    if (r.nombre)           { this.formData.nombre = tc(r.nombre)!;                    campos.push('Nombre'); }
    if (r.apellido_paterno) { this.formData.apellidoPaterno = tc(r.apellido_paterno)!; campos.push('Apellido paterno'); }
    if (r.apellido_materno) { this.formData.apellidoMaterno = tc(r.apellido_materno)!; campos.push('Apellido materno'); }
    if (r.fecha_nacimiento) { this.formData.fechaNacimiento = r.fecha_nacimiento;       campos.push('Fecha de nacimiento'); }
    if (r.sexo)             { this.formData.sexo = r.sexo;                              campos.push('Sexo'); }
    if (r.curp)             { this.formData.curp = r.curp.toUpperCase();                campos.push('CURP'); this.onCurpBlur(); }

    if (r.nombre_padre && r.nombre_madre) {
      this.formData.nombrePadreMadre = `${tc(r.nombre_padre)} / ${tc(r.nombre_madre)}`;
      campos.push('Nombre padre/madre');
    } else if (r.nombre_padre) {
      this.formData.nombrePadreMadre = tc(r.nombre_padre)!; campos.push('Nombre del padre');
    } else if (r.nombre_madre) {
      this.formData.nombrePadreMadre = tc(r.nombre_madre)!; campos.push('Nombre de la madre');
    }

    if (r.calle)           { this.formData.calle = tc(r.calle)!;                     campos.push('Calle'); }
    if (r.numero_exterior) { this.formData.numeroExterior = r.numero_exterior;        campos.push('Núm. exterior'); }
    if (r.numero_interior) { this.formData.numeroInterior = r.numero_interior;        campos.push('Núm. interior'); }
    if (r.colonia)         { this.formData.colonia = tc(r.colonia)!;                  campos.push('Colonia'); }
    if (r.municipio) {
      const mun = tc(r.municipio)!;
      this.formData.municipio = mun;
      if (!this.formData.ciudad) this.formData.ciudad = mun;
      campos.push('Municipio');
    }
    if (r.codigo_postal)   { this.formData.codigoPostal = r.codigo_postal;            campos.push('Código postal'); }

    const rawEstado = r.estado_residencia || r.estado_nacimiento;
    if (rawEstado) {
      const norm = this._normalize(rawEstado);
      const match = this.estados.find(e =>
        this._normalize(e) === norm ||
        this._normalize(e).includes(norm) ||
        norm.includes(this._normalize(e))
      );
      this.formData.estado = match ?? tc(rawEstado)!;
      campos.push('Estado');
    }

    this.ocrMergedCampos = campos;
  }

  // ── Fotografía ─────────────────────────────────────────────────
  onFotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fotografiaFile = file;
    this.fotografiaName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => { this.fotografiaPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  quitarFotografia(): void {
    this.fotografiaFile = null;
    this.fotografiaName = '';
    this.fotografiaPreview = null;
  }

  // ── Form helpers ───────────────────────────────────────────────
  onFechaNacimientoChange(): void {
    if (this.esMenorDeEdad) this.formData.requiereTutor = true;
  }

  onCurpChange(val: string): void {
    this.formData.curp = (val || '').toUpperCase();
    this.curpDisponible = null;
    this.invalidFields = this.invalidFields.filter(f => f !== 'curp');
    delete this.fieldErrors['curp'];
  }

  onCurpBlur(): void {
    const curp = (this.formData.curp || '').trim().toUpperCase();
    if (curp.length !== 18 || !CURP_REGEX.test(curp)) return;
    this.checkingCurp = true;
    this.curpDisponible = null;
    this.api.checkCurpDisponible(curp)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.checkingCurp = false;
          this.curpDisponible = res.disponible;
          if (!res.disponible) {
            if (!this.invalidFields.includes('curp')) this.invalidFields.push('curp');
            this.fieldErrors['curp'] = 'Este CURP ya está registrado. Si ya enviaste un pre-registro, contáctanos.';
          } else {
            this.invalidFields = this.invalidFields.filter(f => f !== 'curp');
            delete this.fieldErrors['curp'];
          }
        },
        error: () => { this.checkingCurp = false; },
      });
  }

  getFieldError(field: string): string { return this.fieldErrors[field] || ''; }

  private _soloLetras(s: string): boolean {
    return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/.test(s.trim());
  }

  private _soloDigitos(s: string): string { return (s || '').replace(/\D/g, ''); }

  private _esTelefono(s: string, codigo: string = '+52'): boolean {
    const n = this._soloDigitos(s).length;
    return codigo === '+52' ? n === 10 : n >= 6 && n <= 15;
  }

  maxTelefono(codigo: string): number { return codigo === '+52' ? 10 : 15; }

  getFieldClass(field: string): string {
    const base = 'w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition-all';
    return this.invalidFields.includes(field)
      ? `${base} border-red-400 focus:border-red-500 focus:ring-red-100`
      : `${base} border-slate-200 focus:border-[#00328b] focus:ring-[#00328b]/10`;
  }

  isEspinaSelected(id: number): boolean { return this.formData.tiposEspinaIds.includes(id); }

  toggleEspina(id: number): void {
    const idx = this.formData.tiposEspinaIds.indexOf(id);
    if (idx >= 0) this.formData.tiposEspinaIds.splice(idx, 1);
    else this.formData.tiposEspinaIds.push(id);
  }

  // ── Validation ─────────────────────────────────────────────────
  validateStep(step: number): boolean {
    this.invalidFields = [];
    this.fieldErrors = {};
    this.stepError = '';
    this.validationAttempted = true;

    if (step === 1 && this.ocrProcessing) {
      this.stepError = 'Espera a que termine el análisis de documentos.';
      return false;
    }

    const rec = this.formData as unknown as Record<string, unknown>;
    for (const field of (this.requiredByStep[step] || [])) {
      const val = rec[field];
      if (!val || (typeof val === 'string' && val.trim() === '')) this.invalidFields.push(field);
    }

    if (step === 2) this._validateDatosPersonales(rec);
    if (step === 4) this._validateContacto(rec);
    if (step === 5 && this.formData.tiposEspinaIds.length === 0) this.invalidFields.push('tiposEspinaIds');

    if (this.invalidFields.length > 0) {
      if (!this.stepError) this.stepError = 'Por favor completa todos los campos obligatorios marcados con *';
      return false;
    }
    return true;
  }

  private _addFieldError(field: string, msg: string): void {
    if (!this.invalidFields.includes(field)) this.invalidFields.push(field);
    this.fieldErrors[field] = msg;
  }

  private _validateDatosPersonales(rec: Record<string, unknown>): void {
    for (const f of ['nombre', 'apellidoPaterno', 'apellidoMaterno']) {
      const v = ((rec[f] as string) || '').trim();
      if (v && !this._soloLetras(v)) this._addFieldError(f, 'Solo se permiten letras en este campo.');
    }
    const vPadre = ((rec['nombrePadreMadre'] as string) || '').trim();
    if (vPadre && !/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'/.-]+$/.test(vPadre))
      this._addFieldError('nombrePadreMadre', 'Solo se permiten letras en este campo.');
    if (this.formData.curp && !CURP_REGEX.test(this.formData.curp.trim().toUpperCase()))
      this._addFieldError('curp', 'El CURP no tiene el formato correcto (18 caracteres).');
    if (this.checkingCurp) {
      if (!this.invalidFields.includes('curp')) this.invalidFields.push('curp');
      this.stepError = 'Espera a que se verifique la disponibilidad del CURP.';
    } else if (this.formData.curp && CURP_REGEX.test(this.formData.curp.trim().toUpperCase()) && this.curpDisponible === null) {
      if (!this.invalidFields.includes('curp')) this.invalidFields.push('curp');
      this.stepError = 'Verifica la disponibilidad del CURP antes de continuar.';
      this.onCurpBlur();
    }
    if (this.curpDisponible === false)
      this._addFieldError('curp', 'Este CURP ya está registrado. Si ya enviaste un pre-registro, contáctanos.');
  }

  private _validateContacto(rec: Record<string, unknown>): void {
    const phoneMsg = (c: unknown) => c === '+52' ? 'El teléfono debe tener exactamente 10 dígitos.' : 'Número inválido.';
    for (const [f, cf] of [['telefonoCelular', 'telefonoCelularCodigo'], ['telefonoEmergencia', 'telefonoEmergenciaCodigo']] as [string, string][]) {
      if (rec[f] && !this._esTelefono(rec[f] as string, rec[cf] as string))
        this._addFieldError(f, phoneMsg(rec[cf]));
    }
    if (this.formData.telefonoCasa && !this._esTelefono(this.formData.telefonoCasa, this.formData.telefonoCasaCodigo))
      this._addFieldError('telefonoCasa', phoneMsg(this.formData.telefonoCasaCodigo));
    if (!this.formData.requiereTutor) return;
    for (const f of ['nombreTutor', 'telefonoTutor', 'relacionTutor']) {
      if (!(rec[f] as string)?.trim()) this.invalidFields.push(f);
    }
    if (this.formData.nombreTutor?.trim() && !this._soloLetras(this.formData.nombreTutor))
      this._addFieldError('nombreTutor', 'Solo se permiten letras en este campo.');
    if (this.formData.telefonoTutor && !this._esTelefono(this.formData.telefonoTutor, this.formData.telefonoTutorCodigo))
      this._addFieldError('telefonoTutor', phoneMsg(this.formData.telefonoTutorCodigo));
  }

  // ── Navigation ─────────────────────────────────────────────────
  nextStep(): void {
    if (!this.validateStep(this.currentStep)) return;
    this.validationAttempted = false;
    this.invalidFields = [];
    this.stepError = '';
    if (this.currentStep < 5) this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevStep(): void {
    this.stepError = '';
    this.invalidFields = [];
    this.validationAttempted = false;
    if (this.currentStep > 1) this.currentStep--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Final submit ───────────────────────────────────────────────
  submitForm(): void {
    if (!this.validateStep(5)) return;
    this.submitting = true;
    const notasParts: string[] = [];
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
      telefono_casa: this.formData.telefonoCasa ? `${this.formData.telefonoCasaCodigo} ${this.formData.telefonoCasa}` : '',
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

    this.api.createPreRegistro(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: PreRegistroCreatedResponse) => {
          if (res.preregistro_token) sessionStorage.setItem('preregistro_token', res.preregistro_token);
          const uploads = this._buildUploads(res.id_paciente);
          if (uploads.length === 0) { this.submitting = false; this.submitted = true; return; }
          forkJoin(uploads).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.submitting = false; this.submitted = true; },
            error: () => { this.submitting = false; this.submitted = true; },
          });
        },
        error: (err: unknown) => {
          this.submitting = false;
          const detail = (err as { error?: { detail?: string } })?.error?.detail;
          this.stepError = (detail?.includes('folio o CURP') || detail?.includes('CURP'))
            ? 'Ya existe un registro con ese CURP. Si ya enviaste un pre-registro, contáctanos.'
            : (detail || 'Ocurrió un error al guardar. Intenta de nuevo.');
        },
      });
  }

  private _buildUploads(pacienteId: number | undefined): Observable<unknown>[] {
    if (!pacienteId) return [];
    const uploads: Observable<unknown>[] = [];
    for (const item of this.ocrFiles) {
      if (item.tipoId !== 0) uploads.push(this.api.uploadDocumento(pacienteId, item.tipoId, item.file));
    }
    if (this.fotografiaFile) {
      const tipoFoto = this.tiposDocumento.find(t => t.nombre?.toLowerCase().includes('fotograf'));
      if (tipoFoto) uploads.push(this.api.uploadDocumento(pacienteId, tipoFoto.id_tipo_documento, this.fotografiaFile));
    }
    return uploads;
  }
}
