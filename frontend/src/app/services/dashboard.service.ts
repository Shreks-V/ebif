import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  DashboardData, PacienteDashboard, DoctorDashboard, AlmacenAlerta,
} from '../shared/models/dashboard.models';
import { Cita, CitasHoyResponse, CitasStats } from '../shared/models/cita.models';
import { DoctorHoyResponse } from '../shared/models/doctor.models';
import { AlmacenStats } from '../shared/models/almacen.models';
import { RecibosStats, Recibo } from '../shared/models/recibo.models';
import { BeneficiariosStats } from '../shared/models/beneficiario.models';
import { ConsolidadoMensual } from '../shared/models/reporte.models';

const AVATAR_COLORS = [
  'bg-pink-400', 'bg-blue-400', 'bg-purple-400',
  'bg-emerald-400', 'bg-amber-400', 'bg-rose-400',
  'bg-cyan-400', 'bg-indigo-400', 'bg-teal-400',
];

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  load(today: Date): Observable<DashboardData & { doctorAtendidos: number; doctorTotalHoy: number }> {
    return forkJoin({
      citasHoy: this.api.getCitasHoy(),
      recibosStats: this.api.getRecibosStats(),
      citasStats: this.api.getCitasStats(),
      almacenStats: this.api.getAlmacenStats(),
      doctor: this.api.getDoctorHoy(),
      benefStats: this.api.getDashboardStats(),
      resumen: this.api.getReporteConsolidadoMensual(today.getMonth() + 1, today.getFullYear()),
      adeudos: this.api.getRecibos({ solo_adeudos: true, limit: 5 }),
    }).pipe(map(res => this._transform(res)));
  }

  private _transform(res: { citasHoy: CitasHoyResponse; recibosStats: RecibosStats; citasStats: CitasStats; almacenStats: AlmacenStats; doctor: DoctorHoyResponse; benefStats: BeneficiariosStats; resumen: ConsolidadoMensual; adeudos: Recibo[] }): DashboardData & { doctorAtendidos: number; doctorTotalHoy: number } {
    const citasHoy = res.citasHoy;
    const citas: Cita[] = citasHoy.citas || citasHoy || [];

    const pacientes = this._buildPacientes(citas);
    const doctor = this._buildDoctor(res.doctor);

    const recibosStats = res.recibosStats;
    const citasStats = res.citasStats;
    const almacenStats = res.almacenStats;
    const benefStats = res.benefStats;
    const resumen = res.resumen;

    return {
      pacientes,
      doctor,
      statCobros: recibosStats.total_hoy ?? recibosStats.total ?? 0,
      statPendientes: recibosStats.pendientes ?? 0,
      statCitas: citasStats.total_hoy ?? citasStats.total ?? 0,
      statBajoStock: (almacenStats.alertas_stock_bajo ?? 0) + (almacenStats.alertas_caducidad ?? 0),
      statBeneficiariosActivos: benefStats.activos ?? benefStats.total ?? 0,
      statComodatosActivos: almacenStats.comodatos_activos ?? 0,
      alertaStockBajo: (almacenStats.stock_bajo || []).slice(0, 5) as AlmacenAlerta[],
      alertasCaducidad: (almacenStats.proximos_vencer || []).slice(0, 5) as AlmacenAlerta[],
      adeudosPendientes: (res.adeudos || []).slice(0, 5),
      deltaBeneficiarios: (benefStats.nuevos_esta_semana ?? 0) - (benefStats.nuevos_semana_anterior ?? 0),
      deltaCitas: (citasStats.total_hoy ?? 0) - (citasStats.total_ayer ?? 0),
      deltaRecibos: (recibosStats.total_hoy ?? 0) - (recibosStats.total_ayer ?? 0),
      resumenNuevosBeneficiarios: resumen.pacientes_atendidos ?? 0,
      resumenCitasCompletadas: resumen.citas_por_estatus?.['COMPLETADA'] ?? 0,
      resumenRecibosGenerados: resumen.total_ventas ?? 0,
      resumenMontoRecaudado: resumen.monto_ventas ?? 0,
      doctorAtendidos: citasHoy.completadas ?? 0,
      doctorTotalHoy: citasHoy.total ?? citas.length ?? 0,
    };
  }

  private _buildPacientes(citas: Cita[]): PacienteDashboard[] {
    return citas
      .filter(c => c.estatus === 'PROGRAMADA' || c.estatus === 'EN_CURSO')
      .map((cita, i) => {
        const fullName = cita.nombre_paciente || '';
        const parts = fullName.trim().split(/\s+/);
        const nombre = parts[0] || '';
        const apellido = parts.slice(1).join(' ') || '';
        const iniciales = (nombre.charAt(0) + (apellido.charAt(0) || '')).toUpperCase();
        let hora = '';
        if (cita.fecha_hora) {
          hora = new Date(cita.fecha_hora).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', hour12: false,
          });
        }
        return {
          idCita: cita.id_cita,
          idPaciente: cita.id_paciente ?? 0,
          nombre,
          apellido,
          folio: cita.folio_paciente || '',
          tipoCuota: cita.tipo_cuota || 'A',
          hora,
          iniciales,
          servicio: cita.servicios?.[0]?.nombre || 'Consulta',
          idServicio: cita.servicios?.[0]?.id_servicio ?? null,
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
          estado: cita.estatus === 'EN_CURSO' ? 'EN_CURSO' : 'PROGRAMADA',
        } as PacienteDashboard;
      });
  }

  private _buildDoctor(resp: DoctorHoyResponse): DoctorDashboard {
    const doctor = resp?.doctor;
    if (!doctor) {
      return { nombre: 'Sin doctor asignado', especialidad: '', iniciales: '--', horario: '—', atendidos: 0, totalHoy: 0 };
    }
    const nombre = doctor.nombre || '';
    const apellido = doctor.apellido_paterno || '';
    const formatTime = (ts: string) =>
      ts ? new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    const inicio = formatTime(resp.hora_inicio ?? '');
    const fin = formatTime(resp.hora_fin ?? '');
    return {
      nombre: `Dr. ${nombre} ${apellido}`.trim(),
      especialidad: doctor.especialidad || '',
      iniciales: (nombre.charAt(0) + apellido.charAt(0)).toUpperCase(),
      horario: inicio && fin ? `${inicio} - ${fin}` : '—',
      atendidos: 0,
      totalHoy: 0,
    };
  }
}
