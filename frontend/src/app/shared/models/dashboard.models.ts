import { Recibo } from './recibo.models';

export interface PacienteDashboard {
  idCita: number;
  idPaciente: number;
  nombre: string;
  apellido: string;
  folio: string;
  tipoCuota: string;
  hora: string;
  iniciales: string;
  servicio: string;
  idServicio: number | null;
  color: string;
  estado: 'PROGRAMADA' | 'EN_CURSO';
}

export interface DoctorDashboard {
  nombre: string;
  especialidad: string;
  iniciales: string;
  horario: string;
  atendidos: number;
  totalHoy: number;
}

export interface AlmacenAlerta {
  id_producto: number;
  nombre: string;
  clave_interna?: string;
  cantidad_disponible?: number;
  nivel_minimo?: number;
  fecha_caducidad?: string;
  estatus_caducidad?: string;
  unidad_medida?: string;
}

export interface DashboardData {
  pacientes: PacienteDashboard[];
  doctor: DoctorDashboard;
  statCobros: number;
  statPendientes: number;
  statCitas: number;
  statBajoStock: number;
  statBeneficiariosActivos: number;
  statComodatosActivos: number;
  alertaStockBajo: AlmacenAlerta[];
  alertasCaducidad: AlmacenAlerta[];
  adeudosPendientes: Recibo[];
  deltaBeneficiarios: number;
  deltaCitas: number;
  deltaRecibos: number;
  resumenNuevosBeneficiarios: number;
  resumenCitasCompletadas: number;
  resumenRecibosGenerados: number;
  resumenItemsEntregados: number;
  resumenMontoRecaudado: number;
}
