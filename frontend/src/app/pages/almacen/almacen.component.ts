import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { InventarioTabComponent } from './tabs/inventario-tab/inventario-tab.component';
import { ServiciosTabComponent } from './tabs/servicios-tab/servicios-tab.component';
import { ComodatosTabComponent } from './tabs/comodatos-tab/comodatos-tab.component';
import { HistorialTabComponent } from './tabs/historial-tab/historial-tab.component';
import { NuevoProductoModalComponent } from './modals/nuevo-producto-modal.component';
import { ConfirmDeleteModalComponent } from './modals/confirm-delete-modal.component';
import { ProductoItem, ServicioItem, ComodatoItem } from './almacen.models';
import { ProductoRaw, ServicioRaw, ComodatoRaw, AlmacenStats, AlmacenAlertaRaw } from '../../shared/models/almacen.models';

@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NavbarComponent, FooterComponent,
    InventarioTabComponent, ServiciosTabComponent,
    ComodatosTabComponent, HistorialTabComponent,
    NuevoProductoModalComponent, ConfirmDeleteModalComponent,
  ],
  templateUrl: './almacen.component.html',
  styles: [`
    @media print {
      @page { margin: 14mm; }
      :host > div:first-child, .fixed { display: none !important; }
      #print-comodato { display: block !important; padding: 0 !important; }
    }
  `],
})
export class AlmacenComponent implements OnInit, OnDestroy {
  activeTab: 'inventario' | 'servicios' | 'comodatos' | 'historial' = 'inventario';
  quickInventoryFilter: 'none' | 'existencias-bajas' | 'proximos-vencer' = 'none';
  selectedCategory: string | null = null;

  loading = true;
  productos: ProductoItem[] = [];
  servicios: ServicioItem[] = [];
  comodatos: ComodatoItem[] = [];
  alertasCaducidad = 0;
  stockBajoProductoIds = new Set<number>();
  proximosVencerProductoIds = new Set<number>();

  // Print comodato (must live in parent so it's outside the hidden-during-print div)
  printingComodato: ComodatoItem | null = null;

  // Shared modals: Nuevo/Editar Producto + Confirm Delete
  productoParaModal: { editingProduct: ProductoItem | null; initialTipo: string } | null = null;
  productoToDelete: { id: number; nombre: string; categoria: string } | null = null;

  get isAdmin(): boolean { return this.auth.isAdmin(); }
  get isAdminOrAlmacen(): boolean { return this.auth.hasRole('ADMINISTRADOR', 'ENCARGADO_ALMACEN'); }
  get debugMode(): boolean { return this.config.debug; }

  private _refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  ngOnInit(): void {
    this.loadProductos();
    this.loadServicios();
    this.loadComodatos();
    this.loadAlmacenStats();

    this._refreshTimer = setInterval(() => {
      this.loadProductos(true);
      this.loadServicios();
      this.loadAlmacenStats();
    }, 60_000);

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'inventario' || tab === 'servicios' || tab === 'comodatos') {
        this.activeTab = tab;
      }
      const filter = String(params['filter'] || '').toLowerCase();
      if (filter === 'alertas') { this.quickInventoryFilter = 'existencias-bajas'; this.activeTab = 'inventario'; }
      if (filter === 'caducidad') { this.quickInventoryFilter = 'proximos-vencer'; this.activeTab = 'inventario'; }
      if (params['action'] === 'nuevo') {
        setTimeout(() => {
          if (this.activeTab !== 'comodatos') this.openNuevoProductoModal();
        }, 0);
      }
    });
  }

  ngOnDestroy(): void {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
  }

  // ── Data Loading ──

  loadProductos(silent = false): void {
    if (!silent) this.loading = true;
    this.api.getProductos({ activo: 'S' }).subscribe({
      next: (data) => {
        this.productos = data.map((p: ProductoRaw) => ({
          idProducto: Number(p.id_producto ?? 0),
          claveInterna: String(p.clave_interna ?? ''),
          nombre: String(p.nombre ?? ''),
          descripcion: String(p.descripcion ?? ''),
          tipoProducto: this._normalizeTipo(p.tipo_producto),
          precioA: this._toNum(p.precio_cuota_a),
          precioB: this._toNum(p.precio_cuota_b),
          activo: String(p.activo ?? 'S'),
          presentacion: p.presentacion,
          dosis: p.dosis,
          requiereCaducidad: p.requiere_caducidad,
          numeroSerie: p.numero_serie,
          marca: p.marca,
          modelo: p.modelo,
          estatusEquipo: p.estatus_equipo,
          observaciones: p.observaciones,
          cantidadDisponible: this._toNum(p.cantidad_disponible),
          nivelMinimo: this._toNum(p.nivel_minimo),
          unidadMedida: String(p.unidad_medida ?? '—'),
          fechaCaducidad: p.fecha_caducidad ?? null,
        })).filter((p: ProductoItem) => p.idProducto > 0 && !!p.nombre);
        if (!silent) this.loading = false;
      },
      error: () => { if (!silent) this.loading = false; },
    });
  }

  loadServicios(): void {
    this.api.getServicios({ activo: 'S' }).subscribe({
      next: (data) => {
        this.servicios = data.map((s: ServicioRaw) => ({
          idServicio: Number(s.id_servicio ?? 0),
          nombre: String(s.nombre ?? ''),
          descripcion: String(s.descripcion ?? ''),
          cuotaRecuperacion: Number(s.cuota_recuperacion ?? 0),
          precioA: this._toNum(s.precio_cuota_a),
          precioB: this._toNum(s.precio_cuota_b),
          activo: String(s.activo ?? 'S'),
          categoria: String(s.categoria ?? 'SERVICIO'),
        })).filter((s: ServicioItem) => s.idServicio > 0 && !!s.nombre);
      },
      error: (err) => console.error('Error loading servicios:', err),
    });
  }

  loadComodatos(): void {
    this.api.getComodatos().subscribe({
      next: (data) => {
        this.comodatos = data.map((c: ComodatoRaw) => ({
          idComodato: c.id_comodato,
          folioComodato: c.folio_comodato,
          idEquipo: c.id_equipo,
          nombreEquipo: c.nombre_equipo,
          idPaciente: c.id_paciente,
          nombrePaciente: c.nombre_paciente,
          folioPaciente: c.folio_paciente,
          fechaPrestamo: c.fecha_prestamo,
          fechaDevolucion: c.fecha_devolucion,
          estatus: c.estatus,
          montoTotal: c.monto_total,
          montoPagado: c.monto_pagado,
          saldoPendiente: c.saldo_pendiente,
          exentoPago: c.exento_pago,
          notas: c.notas,
        }));
      },
      error: (err) => console.error('Error loading comodatos:', err),
    });
  }

  loadAlmacenStats(): void {
    this.api.getAlmacenStats().subscribe({
      next: (stats: AlmacenStats) => {
        this.alertasCaducidad = stats.alertas_caducidad ?? 0;
        const stockBajo: AlmacenAlertaRaw[] = Array.isArray(stats?.stock_bajo) ? stats.stock_bajo : [];
        const proximos: AlmacenAlertaRaw[] = Array.isArray(stats?.proximos_vencer) ? stats.proximos_vencer : [];
        this.stockBajoProductoIds = new Set(
          stockBajo.map((i: AlmacenAlertaRaw) => Number(i?.id_producto)).filter((id: number) => Number.isInteger(id) && id > 0)
        );
        this.proximosVencerProductoIds = new Set(
          proximos.map((i: AlmacenAlertaRaw) => Number(i?.id_producto)).filter((id: number) => Number.isInteger(id) && id > 0)
        );
      },
      error: () => {
        this.alertasCaducidad = 0;
        this.stockBajoProductoIds.clear();
        this.proximosVencerProductoIds.clear();
      },
    });
  }

  // ── KPI helpers ──

  getBajoStockCount(): number {
    return this.productos.filter(p =>
      p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo
    ).length;
  }

  getProximosAVencerCount(): number {
    const calculado = this.productos.filter(p => this._isCaducidadEnRiesgo(p.fechaCaducidad)).length;
    return Math.max(this.alertasCaducidad, this.proximosVencerProductoIds.size, calculado);
  }

  getComodatosActivosCount(): number {
    return this.comodatos.filter(c => c.estatus === 'PRESTADO').length;
  }

  mostrarInventarioCompleto(): void {
    this.activeTab = 'inventario';
    this.quickInventoryFilter = 'none';
    this.selectedCategory = null;
  }

  mostrarExistenciasBajas(): void {
    if (this.getBajoStockCount() === 0 && this.stockBajoProductoIds.size === 0) return;
    this.activeTab = 'inventario';
    this.quickInventoryFilter = 'existencias-bajas';
    this.selectedCategory = null;
  }

  mostrarProximosAVencer(): void {
    if (this.getProximosAVencerCount() === 0) return;
    this.activeTab = 'inventario';
    this.quickInventoryFilter = 'proximos-vencer';
    this.selectedCategory = null;
  }

  mostrarComodatosActivos(): void {
    if (this.getComodatosActivosCount() === 0) return;
    this.activeTab = 'comodatos';
  }

  // ── Shared Modal: Nuevo/Editar Producto ──

  openNuevoProductoModal(tipoInicial = ''): void {
    this.productoParaModal = { editingProduct: null, initialTipo: tipoInicial };
  }

  openEditProductoModal(item: { id: number; categoria: string; nombre: string }): void {
    const producto = this.productos.find(p => p.idProducto === item.id);
    if (!producto) return;
    this.productoParaModal = { editingProduct: producto, initialTipo: '' };
  }

  onProductoGuardado(): void {
    const isServicio = this.productoParaModal?.editingProduct
      ? this.productoParaModal.editingProduct.tipoProducto === 'SERVICIO'
      : this.productoParaModal?.initialTipo === 'SERVICIO';
    isServicio ? this.loadServicios() : this.loadProductos();
    this.productoParaModal = null;
  }

  // ── Shared Modal: Confirm Delete ──

  openConfirmDeleteModal(item: { id: number; nombre: string; categoria: string }): void {
    this.productoToDelete = item;
  }

  onProductoEliminado(): void {
    const isServicio = this.productoToDelete?.categoria === 'SERVICIO';
    isServicio ? this.loadServicios() : this.loadProductos();
    this.productoToDelete = null;
  }

  // ── Print ──

  handlePrintComodato(com: ComodatoItem): void {
    this.printingComodato = com;
    setTimeout(() => {
      window.print();
      this.printingComodato = null;
    }, 300);
  }

  // ── Helpers ──

  private _normalizeTipo(value: unknown): string {
    const tipo = String(value || '').trim().toUpperCase();
    return tipo === 'EQUIPO_MEDICO' ? 'EQUIPO' : tipo;
  }

  private _toNum(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private _isCaducidadEnRiesgo(fechaCaducidad?: string | null): boolean {
    if (!fechaCaducidad) return false;
    const normalized = fechaCaducidad.includes('T') ? fechaCaducidad : `${fechaCaducidad}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return false;
    const fecha = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const hoy = new Date();
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const limite = new Date(base);
    limite.setDate(base.getDate() + 30);
    return fecha <= limite;
  }

}
