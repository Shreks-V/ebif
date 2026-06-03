import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';
import {
  mockBeneficiarios,
  mockCitas,
  mockRecibos,
  mockRecibosStats,
  mockMetodosPago,
  mockServicios,
  mockProductos,
  mockComodatos,
  mockMedicos,
  mockDashboard,
  mockUsuarios,
  mockAuthMe,
  mockDoctorHoy,
  mockAlmacenStats,
  mockBitacora,
} from './mock-data';

/**
 * ApiMockHelper wires up page.route() intercepts for all common API endpoints
 * so tests can run without a live backend.
 *
 * Usage:
 *   const api = new ApiMockHelper(page);
 *   await api.mockAll();
 *   await page.goto('/dashboard');
 */
export class ApiMockHelper {
  constructor(private readonly page: Page) {}

  // ── Auth ────────────────────────────────────────────────────────────────

  async mockAuthMe(userData = mockAuthMe): Promise<void> {
    await this.page.route('**/api/auth/me**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(userData) });
    });
  }

  async mockAuthLogin(token = 'MOCK_TOKEN'): Promise<void> {
    await this.page.route('**/api/auth/login**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: token, token_type: 'bearer' }),
      });
    });
  }

  async mockAuthLoginFail(): Promise<void> {
    await this.page.route('**/api/auth/login**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Credenciales incorrectas' }),
      });
    });
  }

  async mockAuthRefresh(): Promise<void> {
    await this.page.route('**/api/auth/refresh**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'REFRESHED', token_type: 'bearer' }) });
    });
  }

  // ── Usuarios del sistema ─────────────────────────────────────────────────

  async mockUsuarios(data = mockUsuarios): Promise<void> {
    // Usuarios del sistema live under /api/auth/usuarios (auth-api.service.ts base = /api/auth)
    await this.page.route('**/api/auth/usuarios**', (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        const newUser = { ...data[0], id_usuario: 99, correo: 'nuevo@ebif.local' };
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newUser) });
      } else if (method === 'PUT') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data[0]) });
      } else {
        route.continue();
      }
    });
  }

  // ── Beneficiarios ────────────────────────────────────────────────────────

  async mockBeneficiarios(data = mockBeneficiarios): Promise<void> {
    await this.page.route('**/api/beneficiarios**', (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Individual folio lookup: /beneficiarios/EB-001
      if (url.match(/\/beneficiarios\/EB-\d+/)) {
        const folio = url.split('/').pop()?.split('?')[0];
        const found = data.find((b) => b.folio_paciente === folio);
        if (found) {
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found) });
        } else {
          route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
        }
        return;
      }

      // Dashboard stats endpoint — MUST be checked BEFORE generic /stats
      if (url.includes('/stats/dashboard') || url.includes('/dashboard')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockDashboard) });
        return;
      }

      // Generic stats endpoint: /beneficiarios/stats
      if (url.includes('/stats')) {
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ total: data.length, activos: data.length, inactivos: 0, nuevos_esta_semana: 0, nuevos_semana_anterior: 0 }),
        });
        return;
      }

      // Historial
      if (url.includes('/historial')) {
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ citas: mockCitas, recibos: mockRecibos, comodatos: mockComodatos }),
        });
        return;
      }

      // Renovar membresía
      if (url.includes('/renovar-membresia') && method === 'POST') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ folio_venta: 'REC-2026-999' }) });
        return;
      }

      // Membresias próximas a vencer
      if (url.includes('/membresias')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }

      // Tipos espina / tipos documento
      if (url.includes('/tipos-espina') || url.includes('/tipos-documento')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }

      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        const created = { ...data[0], id_paciente: 99, folio_paciente: 'EB-099' };
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
      } else {
        route.continue();
      }
    });
  }

  async mockBeneficiariosCombobox(data = mockBeneficiarios): Promise<void> {
    // The combobox component calls /api/beneficiarios/combobox or uses the main list
    await this.page.route('**/api/beneficiarios/combobox**', (route) => {
      const mapped = data.map((b) => ({
        id: b.id_paciente,
        folio: b.folio_paciente,
        nombre: `${b.nombre} ${b.apellido_paterno} ${b.apellido_materno}`,
        tipo_cuota: b.tipo_cuota,
      }));
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mapped) });
    });
  }

  // ── Citas ───────────────────────────────────────────────────────────────

  async mockCitas(data = mockCitas): Promise<void> {
    await this.page.route('**/api/citas**', (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Individual PATCH/PUT actions
      if (url.includes('/iniciar') && method === 'PATCH') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...data[0], estatus: 'EN_CURSO' }) });
        return;
      }
      if (url.includes('/completar') && method === 'PATCH') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...data[0], estatus: 'COMPLETADA' }) });
        return;
      }
      if (url.includes('/cancelar') && method === 'PATCH') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...data[0], estatus: 'CANCELADA' }) });
        return;
      }

      // GET individual cita
      if (url.match(/\/citas\/\d+/) && method === 'GET') {
        const idStr = url.split('/citas/')[1]?.split('?')[0];
        const id = Number(idStr);
        const found = data.find((c) => c.id_cita === id);
        if (found) {
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found) });
        } else {
          route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
        }
        return;
      }

      // Stats
      if (url.includes('/stats')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: data.length, hoy: data.length, total_hoy: data.length, total_ayer: 0 }) });
        return;
      }

      // /citas/hoy — dashboard widget
      if (url.includes('/hoy')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ citas: data, total: data.length, completadas: 0 }) });
        return;
      }

      // Doctor services
      if (url.includes('/doctores') && url.includes('/servicios')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockServicios.map(s => ({ id_servicio: s.id_servicio }))) });
        return;
      }

      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        const created = { ...data[0], id_cita: 99 };
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
      } else {
        route.continue();
      }
    });
  }

  // ── Recibos ──────────────────────────────────────────────────────────────

  async mockRecibos(data = mockRecibos): Promise<void> {
    await this.page.route('**/api/recibos**', (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/metodos-pago')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMetodosPago) });
        return;
      }
      if (url.includes('/stats')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRecibosStats) });
        return;
      }
      if (url.includes('/consolidado') || url.includes('/consolidado-mensual') || url.includes('/reporte')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pacientes_atendidos: 0, citas_por_estatus: {}, total_ventas: 0, monto_ventas: 0 }) });
        return;
      }

      // Individual recibo PATCH/PUT
      if (url.match(/\/recibos\/\d+\/pago/) && method === 'PATCH') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...data[0], monto_pagado: 100 }) });
        return;
      }
      if (url.match(/\/recibos\/\d+\/cancelar/) && method === 'PATCH') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...data[0], estatus_pago: 'CANCELADO' }) });
        return;
      }

      // GET individual
      if (url.match(/\/recibos\/\d+/) && method === 'GET') {
        const idStr = url.split('/recibos/')[1]?.split('?')[0];
        const id = Number(idStr);
        const found = data.find((r) => r.id_venta === id);
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found ?? data[0]) });
        return;
      }

      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        const created = { ...data[0], id_venta: 99, folio_venta: 'REC-2026-099' };
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
      } else {
        route.continue();
      }
    });
  }

  // ── Métodos de pago ──────────────────────────────────────────────────────

  async mockMetodosPago(data = mockMetodosPago): Promise<void> {
    await this.page.route('**/api/recibos/metodos-pago**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    // Also mock the direct metodos-pago endpoint if used
    await this.page.route('**/api/metodos-pago**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
  }

  // ── Servicios (almacén) ──────────────────────────────────────────────────

  async mockServicios(data = mockServicios): Promise<void> {
    await this.page.route('**/api/almacen/servicios**', (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...data[0], id_servicio: 99 }) });
      } else {
        route.continue();
      }
    });
  }

  // ── Productos (almacén) ──────────────────────────────────────────────────

  async mockProductos(data = mockProductos): Promise<void> {
    await this.page.route('**/api/almacen/productos**', (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/existencia') && method === 'PATCH') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...data[0], cantidad_disponible: 99 }) });
        return;
      }

      if (url.match(/\/productos\/\d+/) && method === 'GET') {
        const idStr = url.split('/productos/')[1]?.split('?')[0];
        const id = Number(idStr);
        const found = data.find((p) => p.id_producto === id);
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found ?? data[0]) });
        return;
      }

      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...data[0], id_producto: 99 }) });
      } else {
        route.continue();
      }
    });
  }

  // ── Comodatos ────────────────────────────────────────────────────────────

  async mockComodatos(data = mockComodatos): Promise<void> {
    await this.page.route('**/api/almacen/comodatos**', (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...data[0], id_comodato: 99 }) });
      } else {
        route.continue();
      }
    });
    // Also handle PUT /comodatos/:id
    await this.page.route('**/api/almacen/comodatos/**', (route) => {
      const method = route.request().method();
      if (method === 'PUT') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...data[0] }) });
      } else {
        route.continue();
      }
    });
  }

  // ── Almacén stats ─────────────────────────────────────────────────────────

  async mockAlmacenStats(): Promise<void> {
    await this.page.route('**/api/almacen/stats**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAlmacenStats) });
    });
  }

  // ── Movimientos ───────────────────────────────────────────────────────────

  async mockMovimientos(): Promise<void> {
    await this.page.route('**/api/almacen/movimientos**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
  }

  // ── Médicos / Doctores ────────────────────────────────────────────────────

  async mockMedicos(data = mockMedicos): Promise<void> {
    await this.page.route('**/api/doctores**', (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/hoy')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockDoctorHoy) });
        return;
      }
      if (url.includes('/servicios')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockServicios.map(s => ({ id_servicio: s.id_servicio }))) });
        return;
      }
      if (url.includes('/disponibilidad')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }
      if (url.match(/\/doctores\/\d+/) && method === 'GET') {
        const idStr = url.split('/doctores/')[1]?.split('?')[0];
        const id = Number(idStr);
        const found = data.find((d) => d.id_doctor === id);
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(found ?? data[0]) });
        return;
      }

      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      } else if (method === 'POST') {
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...data[0], id_doctor: 99 }) });
      } else {
        route.continue();
      }
    });
  }

  // ── Dashboard ────────────────────────────────────────────────────────────

  async mockDashboard(data = mockDashboard): Promise<void> {
    // The dashboard service calls getDashboardStats() → /api/beneficiarios/stats/dashboard
    // This is already handled in mockBeneficiarios() by routing /stats/dashboard to mockDashboard
    // Add a separate route for any metricas endpoint
    await this.page.route('**/api/metricas**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    // Reportes consolidado mensual (used by dashboard service)
    await this.page.route('**/api/reportes/consolidado**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pacientes_atendidos: 0, citas_por_estatus: {}, total_ventas: 0, monto_ventas: 0 }) });
    });
  }

  // ── Bitácora ─────────────────────────────────────────────────────────────

  async mockBitacora(data = mockBitacora): Promise<void> {
    // BitacoraResponse shape: { items: BitacoraItem[], total: number }
    await this.page.route('**/api/bitacora**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
  }

  // ── Preregistros ─────────────────────────────────────────────────────────

  async mockPreregistros(): Promise<void> {
    await this.page.route('**/api/preregistro**', (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        route.continue();
      }
    });
  }

  // ── Búsqueda global ──────────────────────────────────────────────────────

  async mockBusqueda(): Promise<void> {
    await this.page.route('**/api/busqueda**', (route) => {
      const mapped = mockBeneficiarios.map((b) => ({
        id_paciente: b.id_paciente,
        folio: b.folio_paciente,
        nombre: b.nombre,
        apellido_paterno: b.apellido_paterno,
        apellido_materno: b.apellido_materno,
        membresia_estatus: b.membresia_estatus,
        _score: 100,
      }));
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mapped) });
    });
  }

  // ── Reportes ─────────────────────────────────────────────────────────────

  async mockReportes(): Promise<void> {
    await this.page.route('**/api/reportes**', (route) => {
      const url = route.request().url();
      if (url.includes('/pdf') || url.includes('/exportar') || url.includes('/contrato')) {
        // Return a tiny fake PDF bytes
        route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: Buffer.from('%PDF-1.4 fake'),
        });
        return;
      }
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) });
    });
  }

  // ── Notificaciones WS / HTTP ──────────────────────────────────────────────

  async mockNotificaciones(): Promise<void> {
    await this.page.route('**/api/notificaciones**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
  }

  // ── Historial de beneficiario ─────────────────────────────────────────────

  async mockHistorial(): Promise<void> {
    await this.page.route('**/api/beneficiarios/*/historial**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          beneficiario: mockBeneficiarios[0],
          citas: mockCitas,
          recibos: mockRecibos,
          comodatos: mockComodatos,
        }),
      });
    });
  }

  // ── All endpoints at once ─────────────────────────────────────────────────

  /**
   * Register all API route mocks. Pass skipTokenInjection=true when a test
   * has already injected its own token and you don't want the admin token
   * from token.txt to overwrite it (e.g. role guard tests).
   */
  async mockAll(skipTokenInjection = false): Promise<void> {
    // Inject token directly into sessionStorage so auth guard always passes,
    // even when the storageState localStorage migration hasn't run yet.
    if (!skipTokenInjection) {
      const tokenPath = path.join(__dirname, '../.auth/token.txt');
      if (fs.existsSync(tokenPath)) {
        const token = fs.readFileSync(tokenPath, 'utf8').trim();
        if (token) {
          await this.page.addInitScript((t: string) => {
            sessionStorage.setItem('token', t);
          }, token);
        }
      }
    }

    await this.mockAuthMe();
    await this.mockAuthRefresh();
    await this.mockPreregistros();
    await this.mockBeneficiarios();
    await this.mockBeneficiariosCombobox();
    await this.mockCitas();
    await this.mockRecibos();
    await this.mockMetodosPago();
    await this.mockServicios();
    await this.mockProductos();
    await this.mockComodatos();
    await this.mockAlmacenStats();
    await this.mockMovimientos();
    await this.mockMedicos();
    await this.mockDashboard();
    await this.mockUsuarios();
    await this.mockBitacora();
    await this.mockBusqueda();
    await this.mockReportes();
    await this.mockNotificaciones();
    await this.mockHistorial();
  }
}
