import { OcrResult } from '../../services/ocr-api.service';

export interface OcrFile {
  id: number;
  file: File;
  tipoId: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  result: OcrResult | null;
  errorMsg: string;
}

export interface PreRegistroFormData {
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

export interface PreRegistroCreatedResponse {
  id_paciente?: number;
  preregistro_token?: string;
}

export interface PaisTelefono {
  bandera: string;
  nombre: string;
  codigo: string;
}
