import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AlmacenApiService } from './almacen-api.service';
import { BeneficiariosApiService, BeneficiariosFilter } from './beneficiarios-api.service';
import { BitacoraApiService } from './bitacora-api.service';
import { CitasApiService, CitasFilter } from './citas-api.service';
import { RecibosApiService, RecibosFilter, PagoPayload } from './recibos-api.service';
import { ReportesApiService, ReporteFilter } from './reportes-api.service';
import { ExportacionesApiService } from './exportaciones-api.service';
import { AuthApiService } from './auth-api.service';
import { PreregistroApiService } from './preregistro-api.service';
import { BitacoraFilter } from '../shared/models/bitacora.models';
import {
  CambiarContrasenaPayload, CrearUsuarioPayload,
  ActualizarUsuarioPayload, ResetContrasenaPayload,
} from '../shared/models/usuario-sistema.models';

/**
 * Facade kept for backward compatibility. Inject domain services directly in new code:
 *   AlmacenApiService, BeneficiariosApiService, CitasApiService, RecibosApiService,
 *   ReportesApiService, ExportacionesApiService, AuthApiService, PreregistroApiService
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private almacen: AlmacenApiService,
    private beneficiarios: BeneficiariosApiService,
    private bitacora: BitacoraApiService,
    private citas: CitasApiService,
    private recibos: RecibosApiService,
    private reportes: ReportesApiService,
    private exportaciones: ExportacionesApiService,
    private auth: AuthApiService,
    private preregistro: PreregistroApiService,
  ) {}

  // ── Beneficiarios ──
  getBeneficiarios(filters?: BeneficiariosFilter) { return this.beneficiarios.getBeneficiarios(filters); }
  getBeneficiario(folio: string) { return this.beneficiarios.getBeneficiario(folio); }
  createBeneficiario(data: any) { return this.beneficiarios.createBeneficiario(data); }
  updateBeneficiario(folio: string, data: any) { return this.beneficiarios.updateBeneficiario(folio, data); }
  deleteBeneficiario(folio: string) { return this.beneficiarios.deleteBeneficiario(folio); }
  getBeneficiarioHistorial(folio: string) { return this.beneficiarios.getBeneficiarioHistorial(folio); }
  getBeneficiariosStats() { return this.beneficiarios.getBeneficiariosStats(); }
  getDashboardStats() { return this.beneficiarios.getDashboardStats(); }
  getMapaBeneficiarios() { return this.beneficiarios.getMapaBeneficiarios(); }
  getTiposEspina() { return this.beneficiarios.getTiposEspina(); }
  getNotificaciones() { return this.beneficiarios.getNotificaciones(); }
  getMembresiasProximasAVencer(dias: number = 30) { return this.beneficiarios.getMembresiasProximasAVencer(dias); }
  renovarMembresia(folio: string, data: any) { return this.beneficiarios.renovarMembresia(folio, data); }

  // ── Citas ──
  getCitas(filters?: CitasFilter) { return this.citas.getCitas(filters); }
  getCita(id: number) { return this.citas.getCita(id); }
  createCita(data: any) { return this.citas.createCita(data); }
  updateCita(id: number, data: any) { return this.citas.updateCita(id, data); }
  iniciarCita(id: number) { return this.citas.iniciarCita(id); }
  completarCita(id: number) { return this.citas.completarCita(id); }
  cancelarCita(id: number) { return this.citas.cancelarCita(id); }
  deleteCita(id: number) { return this.citas.deleteCita(id); }
  getCitasStats() { return this.citas.getCitasStats(); }
  getCitasHoy() { return this.citas.getCitasHoy(); }

  // ── Doctores ──
  getDoctores() { return this.citas.getDoctores(); }
  getDoctorHoy() { return this.citas.getDoctorHoy(); }
  getDoctor(id: number) { return this.citas.getDoctor(id); }
  createDoctor(data: any) { return this.citas.createDoctor(data); }
  updateDoctor(id: number, data: any) { return this.citas.updateDoctor(id, data); }
  deleteDoctor(id: number) { return this.citas.deleteDoctor(id); }
  getDoctorDisponibilidad(id: number) { return this.citas.getDoctorDisponibilidad(id); }
  getDisponibilidadSemana() { return this.citas.getDisponibilidadSemana(); }
  createDoctorDisponibilidad(idDoctor: number, data: any) { return this.citas.createDoctorDisponibilidad(idDoctor, data); }
  deleteDoctorDisponibilidad(idDoctor: number, idDisponibilidad: number) { return this.citas.deleteDoctorDisponibilidad(idDoctor, idDisponibilidad); }
  getDoctorServicios(id: number) { return this.citas.getDoctorServicios(id); }
  getDoctorDisponibilidadEspecial(id: number) { return this.citas.getDoctorDisponibilidadEspecial(id); }
  createDoctorDisponibilidadEspecial(idDoctor: number, data: any) { return this.citas.createDoctorDisponibilidadEspecial(idDoctor, data); }
  deleteDoctorDisponibilidadEspecial(idDoctor: number, idDispEspecial: number) { return this.citas.deleteDoctorDisponibilidadEspecial(idDoctor, idDispEspecial); }

  // ── Almacén ──
  getProductos(filters?: any) { return this.almacen.getProductos(filters); }
  createProducto(data: any) { return this.almacen.createProducto(data); }
  updateProducto(id: number, data: any) { return this.almacen.updateProducto(id, data); }
  deleteProducto(id: number) { return this.almacen.deleteProducto(id); }
  ajustarExistencia(id: number, stockNuevo: number, motivo: string) { return this.almacen.ajustarExistencia(id, stockNuevo, motivo); }
  getServicios(filters?: any) { return this.almacen.getServicios(filters); }
  createServicio(data: any) { return this.almacen.createServicio(data); }
  updateServicio(id: number, data: any) { return this.almacen.updateServicio(id, data); }
  deleteServicio(id: number) { return this.almacen.deleteServicio(id); }
  getComodatos(filters?: any) { return this.almacen.getComodatos(filters); }
  createComodato(data: any) { return this.almacen.createComodato(data); }
  updateComodato(id: number, data: any) { return this.almacen.updateComodato(id, data); }
  getAlmacenStats() { return this.almacen.getAlmacenStats(); }
  getMovimientos(filters?: any) { return this.almacen.getMovimientos(filters); }

  // ── Recibos ──
  getRecibos(filters?: RecibosFilter) { return this.recibos.getRecibos(filters); }
  createRecibo(data: any) { return this.recibos.createRecibo(data); }
  getRecibo(id: number) { return this.recibos.getRecibo(id); }
  cancelarRecibo(id: number, motivo?: string) { return this.recibos.cancelarRecibo(id, motivo); }
  getRecibosStats() { return this.recibos.getRecibosStats(); }
  getMetodosPago() { return this.recibos.getMetodosPago(); }
  getReciboItems(id: number) { return this.recibos.getReciboItems(id); }
  registrarPagoParcial(idVenta: number, data: PagoPayload) { return this.recibos.registrarPagoParcial(idVenta, data); }
  exentarVenta(idVenta: number, nota?: string) { return this.recibos.exentarVenta(idVenta, nota); }

  // ── Exportaciones ──
  exportarReportePdf(tipo: string, filters?: any): Observable<Blob> { return this.exportaciones.exportarReportePdf(tipo, filters); }
  exportarReporteExcel(tipo: string, filters?: any): Observable<Blob> { return this.exportaciones.exportarReporteExcel(tipo, filters); }
  exportarBeneficiarioPdf(folio: string): Observable<Blob> { return this.exportaciones.exportarBeneficiarioPdf(folio); }
  exportarCredencialPdf(folio: string): Observable<Blob> { return this.exportaciones.exportarCredencialPdf(folio); }
  exportarBeneficiariosExcel(filters?: any): Observable<Blob> { return this.exportaciones.exportarBeneficiariosExcel(filters); }
  exportarComprobanteCitaPdf(idCita: number): Observable<Blob> { return this.exportaciones.exportarComprobanteCitaPdf(idCita); }
  exportarContratoComodatoPdf(idComodato: number): Observable<Blob> { return this.exportaciones.exportarContratoComodatoPdf(idComodato); }

  // ── Reportes ──
  getReportePorGenero(filters?: ReporteFilter) { return this.reportes.getReportePorGenero(filters); }
  getReportePorEtapaVida(filters?: ReporteFilter) { return this.reportes.getReportePorEtapaVida(filters); }
  getReportePorTipoEspina(filters?: ReporteFilter) { return this.reportes.getReportePorTipoEspina(filters); }
  getReportePorEstado(filters?: ReporteFilter) { return this.reportes.getReportePorEstado(filters); }
  getReporteResumen(filters?: ReporteFilter) { return this.reportes.getReporteResumen(filters); }
  getReporteServiciosPorTipo(filters?: ReporteFilter) { return this.reportes.getReporteServiciosPorTipo(filters); }
  getReporteEstudiosPorTipo(filters?: ReporteFilter) { return this.reportes.getReporteEstudiosPorTipo(filters); }
  getReportePagosExentos(filters?: ReporteFilter) { return this.reportes.getReportePagosExentos(filters); }
  getReportePagosPorMetodo(fechaInicio?: string, fechaFin?: string) { return this.reportes.getReportePagosPorMetodo(fechaInicio, fechaFin); }
  getReporteConsolidadoMensual(mes?: number, anio?: number) { return this.reportes.getReporteConsolidadoMensual(mes, anio); }
  getHistorialReportes(filters?: any) { return this.reportes.getHistorialReportes(filters); }
  getReportePorCiudad() { return this.reportes.getReportePorCiudad(); }
  getIndicadoresDesempeno(filters?: any) { return this.reportes.getIndicadoresDesempeno(filters); }

  // ── Pre-registro ──
  getPreRegistros() { return this.preregistro.getPreRegistros(); }
  getPreRegistro(id: number) { return this.preregistro.getPreRegistro(id); }
  createPreRegistro(data: any) { return this.preregistro.createPreRegistro(data); }
  updatePreRegistro(id: number, data: any) { return this.preregistro.updatePreRegistro(id, data); }
  aprobarPreRegistro(id: number, tipoCuota?: string) { return this.preregistro.aprobarPreRegistro(id, tipoCuota); }
  rechazarPreRegistro(id: number) { return this.preregistro.rechazarPreRegistro(id); }
  getTiposEspinaPublic() { return this.preregistro.getTiposEspinaPublic(); }
  getTiposDocumentoPublic() { return this.preregistro.getTiposDocumentoPublic(); }
  checkCurpDisponible(curp: string) { return this.preregistro.checkCurpDisponible(curp); }
  uploadDocumento(idPaciente: number, idTipoDocumento: number, file: File) { return this.preregistro.uploadDocumento(idPaciente, idTipoDocumento, file); }
  getDocumentos(idPaciente: number) { return this.preregistro.getDocumentos(idPaciente); }
  getDocumentoArchivoUrl(idPaciente: number, idDocumento: number) { return this.preregistro.getDocumentoArchivoUrl(idPaciente, idDocumento); }
  getDocumentoBlob(idPaciente: number, idDocumento: number): Observable<Blob> { return this.preregistro.getDocumentoBlob(idPaciente, idDocumento); }
  deleteDocumento(idPaciente: number, idDocumento: number) { return this.preregistro.deleteDocumento(idPaciente, idDocumento); }

  // ── Bitácora ──
  getBitacora(filters?: BitacoraFilter) { return this.bitacora.getBitacora(filters); }

  // ── Auth ──
  cambiarContrasena(data: CambiarContrasenaPayload) { return this.auth.cambiarContrasena(data); }
  listarUsuariosSistema() { return this.auth.listarUsuariosSistema(); }
  adminResetContrasena(idUsuario: number, data: ResetContrasenaPayload) { return this.auth.adminResetContrasena(idUsuario, data); }
  crearUsuarioSistema(data: CrearUsuarioPayload) { return this.auth.crearUsuarioSistema(data); }
  actualizarUsuarioSistema(idUsuario: number, data: ActualizarUsuarioPayload) { return this.auth.actualizarUsuarioSistema(idUsuario, data); }
  seedUsers() { return this.auth.seedUsers(); }
}
