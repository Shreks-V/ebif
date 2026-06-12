import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { DashboardService } from '../../services/dashboard.service';
import { ToastService } from '../../core/toast.service';
import { WalkInModalComponent } from './modals/walk-in-modal.component';
import { NuevoCobroComponent, PreselectedCobroServicio, PreselectedPacienteCobro } from '../recibos/nuevo-cobro/nuevo-cobro.component';
import { PacienteDashboard, AlmacenAlerta } from '../../shared/models/dashboard.models';
import { Recibo } from '../../shared/models/recibo.models';
import { getApiError } from '../../shared/utils/error.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, WalkInModalComponent, NuevoCobroComponent],
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
  resumenItemsEntregados = 0;
  resumenMontoRecaudado = 0;

  doctorNombre = 'Sin doctor asignado';
  doctorEspecialidad = '';
  doctorIniciales = '--';
  doctorAtendidos = 0;
  doctorTotalHoy = 0;
  doctorHorario = '—';

  showWalkInModal = false;
  pacienteParaRecibo: (PreselectedPacienteCobro & { idServicio?: number | null; servicio?: string | null; servicios?: PreselectedCobroServicio[]; idCita?: number }) | null = null;
  pacienteAcciones: PacienteDashboard | null = null;
  private _pendingPaciente: PacienteDashboard | null = null;

  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  constructor(
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.todayFormatted = today.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).replace(/^\w/, c => c.toUpperCase());

    this.resumenSemanaLabel = today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());

    this.dashboardService.load(today)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
        this.resumenItemsEntregados = data.resumenItemsEntregados ?? 0;
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

  abrirAcciones(paciente: PacienteDashboard): void {
    this.pacienteAcciones = paciente;
  }

  cerrarAcciones(): void {
    this.pacienteAcciones = null;
  }

  iniciarAtencion(paciente: PacienteDashboard): void {
    this.cerrarAcciones();
    if (!paciente.idCita) return;
    paciente.estado = 'EN_CURSO';
    this.api.iniciarCita(paciente.idCita)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => {
          paciente.estado = 'PROGRAMADA';
          this.toast.show(getApiError(err, 'Error al iniciar la cita'), 'error');
        },
      });
  }

  reprogramarCita(paciente: PacienteDashboard): void {
    this.cerrarAcciones();
    if (!paciente.idCita) return;
    paciente.estado = 'PROGRAMADA';
    this.api.reprogramarCita(paciente.idCita)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => {
          paciente.estado = 'EN_CURSO';
          this.toast.show(getApiError(err, 'Error al reprogramar la cita'), 'error');
        },
      });
  }

  cancelarCita(paciente: PacienteDashboard): void {
    this.cerrarAcciones();
    if (!paciente.idCita) return;
    this.api.cancelarCita(paciente.idCita)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pacientes = this.pacientes.filter(p => p.idCita !== paciente.idCita);
          this.toast.show('Cita cancelada', 'info');
        },
        error: (err) => this.toast.show(getApiError(err, 'Error al cancelar la cita'), 'error'),
      });
  }

  marcarAtendido(paciente: PacienteDashboard): void {
    this.cerrarAcciones();
    if (!paciente.idCita) return;
    this._pendingPaciente = paciente;
    this.pacienteParaRecibo = {
      idPaciente: paciente.idPaciente,
      nombre: `${paciente.nombre} ${paciente.apellido}`.trim(),
      folio: paciente.folio,
      tipoCuota: paciente.tipoCuota || 'A',
      idServicio: paciente.idServicio ?? null,
      servicio: paciente.servicio ?? null,
      servicios: paciente.servicios ?? [],
      idCita: paciente.idCita,
    };
  }

  onReciboCancelado(): void {
    this._pendingPaciente = null;
    this.pacienteParaRecibo = null;
  }

  onWalkInRegistrado(): void {
    this.showWalkInModal = false;
    this.api.getCitasHoy()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          const citas = resp.citas ?? [];
          this.pacientes = this.dashboardService.buildPacientes(citas);
          this.doctorTotalHoy = resp.total ?? citas.length;
        },
        error: () => {
          this.toast.show('No se pudo actualizar la lista de citas', 'error');
        },
      });
  }

  onReciboGuardado(): void {
    const paciente = this._pendingPaciente;
    this._pendingPaciente = null;
    this.pacienteParaRecibo = null;
    if (!paciente?.idCita) return;
    this.pacientes = this.pacientes.filter(p => p.idCita !== paciente.idCita);
    this.doctorAtendidos++;
    this.api.completarCita(paciente.idCita)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => {
          this.toast.show(getApiError(err, 'Error al completar la cita'), 'error');
        },
      });
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
