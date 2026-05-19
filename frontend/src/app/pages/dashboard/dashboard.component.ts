import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { DashboardService } from '../../services/dashboard.service';
import { WalkInModalComponent } from './modals/walk-in-modal.component';
import { ReciboPostCitaModalComponent, ReciboModalPaciente } from './modals/recibo-post-cita-modal.component';
import { PacienteDashboard, AlmacenAlerta } from '../../shared/models/dashboard.models';
import { Recibo } from '../../shared/models/recibo.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, WalkInModalComponent, ReciboPostCitaModalComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loading = true;
  todayFormatted = '';
  pacientes: PacienteDashboard[] = [];

  statCobros = 0;
  statPendientes = 0;
  statCitas = 0;
  statBajoStock = 0;
  statBeneficiariosActivos = 0;
  statComodatosActivos = 0;

  alertaStockBajo: AlmacenAlerta[] = [];
  alertasCaducidad: AlmacenAlerta[] = [];
  adeudosPendientes: Recibo[] = [];
  deltaBeneficiarios = 0;
  deltaCitas = 0;
  deltaRecibos = 0;
  resumenSemanaLabel = '';
  resumenNuevosBeneficiarios = 0;
  resumenCitasCompletadas = 0;
  resumenRecibosGenerados = 0;
  resumenMontoRecaudado = 0;

  doctorNombre = 'Sin doctor asignado';
  doctorEspecialidad = '';
  doctorIniciales = '--';
  doctorAtendidos = 0;
  doctorTotalHoy = 0;
  doctorHorario = '—';

  showWalkInModal = false;
  pacienteParaRecibo: ReciboModalPaciente | null = null;

  constructor(
    private router: Router,
    private api: ApiService,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.todayFormatted = today.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).replace(/^\w/, c => c.toUpperCase());

    this.resumenSemanaLabel = today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());

    this.dashboardService.load(today).subscribe({
      next: (data) => {
        this.pacientes = data.pacientes;
        this.doctorNombre = data.doctor.nombre;
        this.doctorEspecialidad = data.doctor.especialidad;
        this.doctorIniciales = data.doctor.iniciales;
        this.doctorHorario = data.doctor.horario;
        this.doctorAtendidos = data.doctorAtendidos;
        this.doctorTotalHoy = data.doctorTotalHoy;
        this.statCobros = data.statCobros;
        this.statPendientes = data.statPendientes;
        this.statCitas = data.statCitas;
        this.statBajoStock = data.statBajoStock;
        this.statBeneficiariosActivos = data.statBeneficiariosActivos;
        this.statComodatosActivos = data.statComodatosActivos;
        this.alertaStockBajo = data.alertaStockBajo;
        this.alertasCaducidad = data.alertasCaducidad;
        this.adeudosPendientes = data.adeudosPendientes;
        this.deltaBeneficiarios = data.deltaBeneficiarios;
        this.deltaCitas = data.deltaCitas;
        this.deltaRecibos = data.deltaRecibos;
        this.resumenNuevosBeneficiarios = data.resumenNuevosBeneficiarios;
        this.resumenCitasCompletadas = data.resumenCitasCompletadas;
        this.resumenRecibosGenerados = data.resumenRecibosGenerados;
        this.resumenMontoRecaudado = data.resumenMontoRecaudado;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  formatFechaCad(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    try {
      return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fecha;
    }
  }

  iniciarAtencion(paciente: PacienteDashboard): void {
    if (!paciente.idCita) return;
    paciente.estado = 'EN_CURSO';
    this.api.iniciarCita(paciente.idCita).subscribe({
      error: () => { paciente.estado = 'PROGRAMADA'; },
    });
  }

  marcarAtendido(paciente: PacienteDashboard): void {
    if (!paciente.idCita) return;
    const backup = [...this.pacientes];
    this.pacientes = this.pacientes.filter(p => p.idCita !== paciente.idCita);
    this.doctorAtendidos++;
    this.api.completarCita(paciente.idCita).subscribe({
      next: () => {
        this.pacienteParaRecibo = {
          idPaciente: paciente.idPaciente,
          nombre: `${paciente.nombre} ${paciente.apellido}`.trim(),
          folio: paciente.folio,
          tipoCuota: paciente.tipoCuota || 'A',
          idServicio: paciente.idServicio,
          servicio: paciente.servicio,
        };
      },
      error: () => {
        this.pacientes = backup;
        this.doctorAtendidos = Math.max(0, this.doctorAtendidos - 1);
      },
    });
  }

  onWalkInRegistrado(): void {
    this.showWalkInModal = false;
    this.api.getCitasHoy().subscribe({
      next: (resp) => {
        const citas = resp.citas || resp || [];
        const nuevos = this.dashboardService['_buildPacientes'](citas);
        this.pacientes = nuevos;
        this.doctorTotalHoy = resp.total ?? citas.length ?? 0;
      },
      error: () => {},
    });
  }

  onReciboGuardado(): void {
    this.pacienteParaRecibo = null;
  }

  navigateTo(route: string, queryParams?: Record<string, string>): void {
    if (queryParams) {
      this.router.navigate([route], { queryParams });
    } else {
      this.router.navigate([route]);
    }
  }

  openWalkInModal(): void {
    this.showWalkInModal = true;
  }
}
