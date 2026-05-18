import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { AutoGrowDirective } from '../../shared/directives/auto-grow.directive';
import { InventarioTabComponent } from './tabs/inventario-tab/inventario-tab.component';
import { ServiciosTabComponent } from './tabs/servicios-tab/servicios-tab.component';
import { ComodatosTabComponent } from './tabs/comodatos-tab/comodatos-tab.component';
import { HistorialTabComponent } from './tabs/historial-tab/historial-tab.component';
import { ProductoItem, ServicioItem, ComodatoItem } from './almacen.models';

@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NavbarComponent, FooterComponent, AutoGrowDirective,
    InventarioTabComponent, ServiciosTabComponent,
    ComodatosTabComponent, HistorialTabComponent,
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
  showNuevoProductoModal = false;
  showConfirmDeleteModal = false;
  editingProduct: ProductoItem | null = null;
  productoToDelete: { id: number; nombre: string; categoria: string } | null = null;
  submittingProducto = false;
  submittingDelete = false;

  productoForm = this._emptyProductoForm();

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
          if (this.activeTab === 'comodatos') {
            // ComodatosTab handles its own modal — nothing needed from parent
          } else {
            this.openNuevoProductoModal();
          }
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
        this.productos = data.map((p: any) => ({
          idProducto: Number(p?.id_producto ?? p?.idProducto ?? 0),
          claveInterna: String(p?.clave_interna ?? p?.claveInterna ?? ''),
          nombre: String(p?.nombre ?? ''),
          descripcion: String(p?.descripcion ?? ''),
          tipoProducto: this._normalizeTipo(p?.tipo_producto ?? p?.tipoProducto),
          precioA: this._toNum(p?.precio_cuota_a ?? p?.precioA),
          precioB: this._toNum(p?.precio_cuota_b ?? p?.precioB),
          activo: String(p?.activo ?? 'S'),
          presentacion: p?.presentacion,
          dosis: p?.dosis,
          requiereCaducidad: p?.requiere_caducidad ?? p?.requiereCaducidad,
          numeroSerie: p?.numero_serie ?? p?.numeroSerie,
          marca: p?.marca,
          modelo: p?.modelo,
          estatusEquipo: p?.estatus_equipo ?? p?.estatusEquipo,
          observaciones: p?.observaciones,
          cantidadDisponible: this._toNum(p?.cantidad_disponible ?? p?.cantidadDisponible),
          nivelMinimo: this._toNum(p?.nivel_minimo ?? p?.nivelMinimo),
          unidadMedida: String(p?.unidad_medida ?? p?.unidadMedida ?? '—'),
          fechaCaducidad: p?.fecha_caducidad ?? p?.fechaCaducidad ?? null,
        })).filter((p: ProductoItem) => p.idProducto > 0 && !!p.nombre);
        if (!silent) this.loading = false;
      },
      error: () => { if (!silent) this.loading = false; },
    });
  }

  loadServicios(): void {
    this.api.getServicios({ activo: 'S' }).subscribe({
      next: (data) => {
        this.servicios = data.map((s: any) => ({
          idServicio: Number(s?.id_servicio ?? s?.idServicio ?? 0),
          nombre: String(s?.nombre ?? ''),
          descripcion: String(s?.descripcion ?? ''),
          cuotaRecuperacion: Number(s?.cuota_recuperacion ?? s?.cuotaRecuperacion ?? 0),
          precioA: this._toNum(s?.precio_cuota_a ?? s?.precioA),
          precioB: this._toNum(s?.precio_cuota_b ?? s?.precioB),
          activo: String(s?.activo ?? 'S'),
          categoria: String(s?.categoria ?? 'SERVICIO'),
        })).filter((s: ServicioItem) => s.idServicio > 0 && !!s.nombre);
      },
      error: (err) => console.error('Error loading servicios:', err),
    });
  }

  loadComodatos(): void {
    this.api.getComodatos().subscribe({
      next: (data) => {
        this.comodatos = data.map((c: any) => ({
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
      next: (stats: any) => {
        this.alertasCaducidad = stats.alertas_caducidad ?? 0;
        const stockBajo = Array.isArray(stats?.stock_bajo) ? stats.stock_bajo : [];
        const proximos = Array.isArray(stats?.proximos_vencer) ? stats.proximos_vencer : [];
        this.stockBajoProductoIds = new Set(
          stockBajo.map((i: any) => Number(i?.id_producto)).filter((id: number) => Number.isInteger(id) && id > 0)
        );
        this.proximosVencerProductoIds = new Set(
          proximos.map((i: any) => Number(i?.id_producto)).filter((id: number) => Number.isInteger(id) && id > 0)
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
    this.editingProduct = null;
    this.productoForm = this._emptyProductoForm();
    if (tipoInicial) this.productoForm.tipo_producto = tipoInicial;
    this.showNuevoProductoModal = true;
  }

  openEditProductoModal(item: { id: number; categoria: string; nombre: string }): void {
    const producto = this.productos.find(p => p.idProducto === item.id);
    if (!producto) return;
    this.editingProduct = producto;
    this.productoForm = {
      clave_interna: producto.claveInterna,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      tipo_producto: producto.tipoProducto,
      categoria: 'SERVICIO',
      precio_cuota_a: producto.precioA,
      precio_cuota_b: producto.precioB,
      activo: producto.activo,
      presentacion: producto.presentacion ?? '',
      dosis: producto.dosis ?? '',
      requiere_caducidad: producto.requiereCaducidad ?? 'S',
      numero_serie: producto.numeroSerie ?? '',
      marca: producto.marca ?? '',
      modelo: producto.modelo ?? '',
      estatus_equipo: producto.estatusEquipo ?? 'DISPONIBLE',
      observaciones: producto.observaciones ?? '',
      cuota_recuperacion: 0,
      cantidad_disponible: producto.cantidadDisponible ?? 0,
      nivel_minimo: producto.nivelMinimo ?? 5,
      unidad_medida: producto.unidadMedida,
      fecha_caducidad: producto.fechaCaducidad ? producto.fechaCaducidad.substring(0, 10) : '',
    };
    this.showNuevoProductoModal = true;
  }

  closeProductoModal(): void {
    this.showNuevoProductoModal = false;
    this.editingProduct = null;
  }

  submitProducto(): void {
    if (!this.productoForm.nombre || !this.productoForm.tipo_producto) return;
    if (this.productoForm.tipo_producto !== 'SERVICIO' && !this.productoForm.clave_interna) return;
    this.submittingProducto = true;
    const payload: any = { ...this.productoForm };

    if (payload.tipo_producto === 'SERVICIO') {
      const servicioPayload = {
        nombre: payload.nombre, descripcion: payload.descripcion, activo: payload.activo,
        precio_cuota_a: payload.precio_cuota_a, precio_cuota_b: payload.precio_cuota_b,
        cuota_recuperacion: payload.cuota_recuperacion ?? 0, categoria: payload.categoria ?? 'SERVICIO',
      };
      this.api.createServicio(servicioPayload).subscribe({
        next: () => { this.loadServicios(); this.closeProductoModal(); this.submittingProducto = false; },
        error: () => { this.submittingProducto = false; },
      });
      return;
    }

    if (payload.tipo_producto === 'MEDICAMENTO') {
      delete payload.numero_serie; delete payload.marca; delete payload.modelo;
      delete payload.estatus_equipo; delete payload.observaciones; delete payload.cuota_recuperacion;
    } else if (payload.tipo_producto === 'EQUIPO') {
      delete payload.presentacion; delete payload.dosis; delete payload.requiere_caducidad;
      delete payload.fecha_caducidad; delete payload.cuota_recuperacion;
    }
    if (payload.fecha_caducidad === '') payload.fecha_caducidad = null;

    const obs = this.editingProduct
      ? this.api.updateProducto(this.editingProduct.idProducto, payload)
      : this.api.createProducto(payload);

    obs.subscribe({
      next: () => { this.loadProductos(); this.closeProductoModal(); this.submittingProducto = false; },
      error: () => { this.submittingProducto = false; },
    });
  }

  // ── Shared Modal: Confirm Delete ──

  openConfirmDeleteModal(item: { id: number; nombre: string; categoria: string }): void {
    this.productoToDelete = item;
    this.showConfirmDeleteModal = true;
  }

  closeConfirmDeleteModal(): void {
    this.showConfirmDeleteModal = false;
    this.productoToDelete = null;
  }

  confirmDelete(): void {
    if (!this.productoToDelete) return;
    this.submittingDelete = true;
    const isServicio = this.productoToDelete.categoria === 'SERVICIO';
    const obs = isServicio
      ? this.api.deleteServicio(this.productoToDelete.id)
      : this.api.deleteProducto(this.productoToDelete.id);

    obs.subscribe({
      next: () => {
        isServicio ? this.loadServicios() : this.loadProductos();
        this.closeConfirmDeleteModal();
        this.submittingDelete = false;
      },
      error: (err) => {
        alert(err?.error?.detail || 'No se pudo eliminar el elemento seleccionado.');
        this.submittingDelete = false;
      },
    });
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

  private _emptyProductoForm() {
    return {
      clave_interna: '', nombre: '', descripcion: '', tipo_producto: '', categoria: 'SERVICIO',
      precio_cuota_a: null as number | null, precio_cuota_b: null as number | null, activo: 'S',
      presentacion: '', dosis: '', requiere_caducidad: 'S', numero_serie: '', marca: '', modelo: '',
      estatus_equipo: 'DISPONIBLE', observaciones: '', cuota_recuperacion: 0,
      cantidad_disponible: 0, nivel_minimo: 5, unidad_medida: '', fecha_caducidad: '',
    };
  }
}
