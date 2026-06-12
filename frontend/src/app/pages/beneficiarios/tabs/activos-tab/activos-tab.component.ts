import { Component, DestroyRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../core/toast.service';
import { CuotaBadgeComponent } from '../../../../shared/components/cuota-badge/cuota-badge.component';
import { AvatarInicialesComponent } from '../../../../shared/components/avatar-iniciales/avatar-iniciales.component';
import { NuevoBeneficiarioModalComponent } from './modals/nuevo-beneficiario-modal.component';
import { DetalleBeneficiarioModalComponent } from './modals/detalle-beneficiario-modal.component';
import { EditarBeneficiarioModalComponent } from './modals/editar-beneficiario-modal.component';
import { HistorialModalComponent } from './modals/historial-modal.component';
import { ConfirmarDesactivarModalComponent } from './modals/confirmar-desactivar-modal.component';
import { RenovarMembresiaModalComponent } from './modals/renovar-membresia-modal.component';
import { CredencialModalComponent } from './modals/credencial-modal.component';
import {
  Beneficiario,
  Documento,
  TableSortState,
} from './activos-tab.types';
import { getMembresiaBadgeClass, getMembresiaVencimientoClass } from './activos-tab.utils';
import { REFRESH_INTERVAL_MS, BLOB_REVOKE_DELAY_MS, ACTION_NUEVO, MEMBRESIA_ACTIVO } from '../../../../shared/constants/app.constants';


@Component({
  selector: 'app-activos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule,
    CuotaBadgeComponent, AvatarInicialesComponent,
    NuevoBeneficiarioModalComponent,
    DetalleBeneficiarioModalComponent,
    EditarBeneficiarioModalComponent,
    HistorialModalComponent,
    ConfirmarDesactivarModalComponent,
    RenovarMembresiaModalComponent,
    CredencialModalComponent],
  templateUrl: './activos-tab.component.html',
})
export class ActivosTabComponent implements OnChanges, OnInit, OnDestroy {
  @Input() isAdmin = false;
  @Input() refreshKey = 0;
  @Output() countChange = new EventEmitter<number>();
  @Output() desactivado = new EventEmitter<void>();

  loading = true;
  beneficiarios: Beneficiario[] = [];
  filteredBeneficiarios: Beneficiario[] = [];
  searchTerm = '';
  page = 1;
  readonly pageSize = 20;
  sort: TableSortState = { key: 'folio', direction: 'asc' };

  membresiasProximasCount = 0;

  // Modal open state — use beneficiario reference as truthy flag where possible
  showNuevoModal = false;
  beneficiarioParaDetalle: Beneficiario | null = null;
  beneficiarioParaEditar: Beneficiario | null = null;
  beneficiarioParaHistorial: Beneficiario | null = null;
  beneficiarioParaDesactivar: Beneficiario | null = null;
  beneficiarioParaRenovar: Beneficiario | null = null;
  beneficiarioParaCredencial: Beneficiario | null = null;

  // Menú contextual
  openActionMenu: string | null = null;
  menuPosition = { top: 0, left: 0 };
  menuBeneficiario: Beneficiario | null = null;
  private actionMenuTriggerElement: HTMLElement | null = null;
  private readonly actionMenuWidth = 208;
  private readonly actionMenuEstimatedHeight = 332;
  private readonly actionMenuGap = 6;
  private readonly actionMenuViewportPadding = 8;
  private readonly onViewportGeometryChange = (): void => {
    this.repositionOpenActionMenu();
  };

  private readonly avatarColors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400',
    'bg-rose-400', 'bg-indigo-400', 'bg-orange-400', 'bg-teal-400',
    'bg-cyan-400', 'bg-amber-400'
  ];

  private _refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly fotoObjectUrls = new Map<number, string>();

  readonly getMembresiaBadgeClass = getMembresiaBadgeClass;
  readonly getMembresiaVencimientoClass = getMembresiaVencimientoClass;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly toast: ToastService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) {
      this.loadBeneficiarios();
      this.loadAlertasMembresia();
    }
  }

  ngOnInit(): void {
    this.loadBeneficiarios();
    this.loadAlertasMembresia();
    this._refreshTimer = setInterval(() => this.loadBeneficiarios(), REFRESH_INTERVAL_MS);

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        if (params['action'] === ACTION_NUEVO) this.showNuevoModal = true;
      });

    window.visualViewport?.addEventListener('resize', this.onViewportGeometryChange, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.onViewportGeometryChange, { passive: true });
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this.onViewportGeometryChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportGeometryChange);
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this.revokeFotoObjectUrls();
  }

  // ──────────── Data loading ────────────

  loadBeneficiarios(): void {
    this.loading = true;
    this.api.getBeneficiarios({ membresia_estatus: MEMBRESIA_ACTIVO })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (data) => {
        this.beneficiarios = data.map((item, index) => ({
          idPaciente: item.id_paciente,
          folio: item.folio,
          nombre: item.nombre,
          apellidoPaterno: item.apellido_paterno,
          apellidoMaterno: item.apellido_materno,
          genero: item.genero,
          fechaNacimiento: item.fecha_nacimiento,
          curp: item.curp,
          nombrePadreMadre: item.nombre_padre_madre,
          direccion: item.direccion,
          colonia: item.colonia,
          ciudad: item.ciudad,
          estado: item.estado,
          codigoPostal: item.codigo_postal,
          telefonoCasa: item.telefono_casa,
          telefonoCelular: item.telefono_celular,
          correoElectronico: item.correo_electronico,
          enEmergenciaAvisarA: item.en_emergencia_avisar_a,
          telefonoEmergencia: item.telefono_emergencia,
          municipioNacimiento: item.municipio_nacimiento,
          estadoNacimiento: item.estado_nacimiento,
          hospitalNacimiento: item.hospital_nacimiento,
          tipoSangre: item.tipo_sangre,
          usaValvula: item.usa_valvula,
          notasAdicionales: item.notas_adicionales,
          fechaAlta: item.fecha_alta,
          membresiaEstatus: item.membresia_estatus,
          tipoCuota: item.tipo_cuota,
          activo: item.activo,
          tiposEspina: (item.tipos_espina || []).map((te) => ({
            idTipoEspina: te.id_tipo_espina,
            nombre: te.nombre
          })),
          fechaInicioMembresia: item.fecha_inicio_membresia || null,
          fechaVencimientoMembresia: item.fecha_vencimiento_membresia || null,
          fotoUrl: null,
          iniciales: (item.nombre?.charAt(0) || '') + (item.apellido_paterno?.charAt(0) || ''),
          color: this.avatarColors[index % this.avatarColors.length]
        } as Beneficiario));
        this.filter();
        this.cargarFotosBeneficiarios(this.beneficiarios);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading beneficiarios:', err);
        this.loading = false;
      }
    });
  }

  private loadAlertasMembresia(): void {
    this.api.getMembresiasProximasAVencer(30)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.membresiasProximasCount = data.length; },
        error: () => { this.membresiasProximasCount = 0; }
      });
  }

  // ──────────── Fotos ────────────

  private esFormatoImagen(formato: unknown): boolean {
    return ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(String(formato || '').trim().toUpperCase()); // NOSONAR
  }

  private obtenerFechaDocumento(valor: unknown): number {
    if (!valor) return 0;
    const ms = new Date(valor as string | number).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  private seleccionarDocumentoFoto(documentos: Documento[]): Documento | null {
    if (!Array.isArray(documentos) || documentos.length === 0) return null;
    const imagenes = documentos.filter((doc) => this.esFormatoImagen(doc?.formato_archivo));
    if (!imagenes.length) return null;
    const fotosExplicitas = imagenes.filter((doc) => {
      const tipo = String(doc?.tipo_nombre || '').toLowerCase();
      const nombreArchivo = String(doc?.nombre_archivo || '').toLowerCase();
      return tipo.includes('foto') || tipo.includes('fotografia') || tipo.includes('imagen') || nombreArchivo.includes('foto');
    });
    const candidatas = fotosExplicitas.length ? fotosExplicitas : imagenes;
    return [...candidatas].sort(
      (a, b) => this.obtenerFechaDocumento(b?.fecha_carga) - this.obtenerFechaDocumento(a?.fecha_carga)
    )[0] || null;
  }

  private actualizarFotoEnVistas(idPaciente: number, fotoUrl: string | null): void {
    const previous = this.fotoObjectUrls.get(idPaciente);
    if (previous && previous !== fotoUrl) URL.revokeObjectURL(previous);
    if (fotoUrl?.startsWith('blob:')) this.fotoObjectUrls.set(idPaciente, fotoUrl);
    else this.fotoObjectUrls.delete(idPaciente);

    const update = (b: Beneficiario) => b.idPaciente === idPaciente ? { ...b, fotoUrl } : b;
    this.beneficiarios = this.beneficiarios.map(update);
    this.filteredBeneficiarios = this.filteredBeneficiarios.map(update);
    if (this.beneficiarioParaDetalle?.idPaciente === idPaciente) {
      this.beneficiarioParaDetalle = { ...this.beneficiarioParaDetalle, fotoUrl };
    }
    if (this.beneficiarioParaCredencial?.idPaciente === idPaciente) {
      this.beneficiarioParaCredencial = { ...this.beneficiarioParaCredencial, fotoUrl };
    }
  }

  private cargarFotosBeneficiarios(items: Beneficiario[]): void {
    if (!items.length) return;
    const requests = items.map((b) =>
      this.api.getDocumentos(b.idPaciente).pipe(
        switchMap((docs: Documento[]) => {
          const fotoDoc = this.seleccionarDocumentoFoto(docs || []);
          if (!fotoDoc?.id_documento) return of({ idPaciente: b.idPaciente, fotoUrl: null });
          return this.api.getDocumentoBlob(b.idPaciente, Number(fotoDoc.id_documento)).pipe(
            map((blob: Blob) => ({
              idPaciente: b.idPaciente,
              fotoUrl: URL.createObjectURL(blob),
            }))
          );
        }),
        catchError(() => of({ idPaciente: b.idPaciente, fotoUrl: null }))
      )
    );
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => results.forEach((item) => this.actualizarFotoEnVistas(item.idPaciente, item.fotoUrl)),
        error: (err) => console.error('Error al cargar fotos de beneficiarios:', err)
      });
  }

  private revokeFotoObjectUrls(): void {
    this.fotoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.fotoObjectUrls.clear();
  }

  // ──────────── Filtering / Sorting / Pagination ────────────

  filter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredBeneficiarios = this.beneficiarios.filter(b =>
      b.nombre.toLowerCase().includes(term) ||
      b.apellidoPaterno.toLowerCase().includes(term) ||
      b.apellidoMaterno.toLowerCase().includes(term) ||
      b.folio.toLowerCase().includes(term) ||
      b.curp.toLowerCase().includes(term) ||
      b.membresiaEstatus.toLowerCase().includes(term) ||
      b.tipoCuota.toLowerCase().includes(term)
    );
    this.page = 1;
    this.countChange.emit(this.filteredBeneficiarios.length);
  }

  get start(): number { return (this.page - 1) * this.pageSize; }
  get end(): number { return Math.min(this.start + this.pageSize, this.filteredBeneficiarios.length); }
  get totalPages(): number { return Math.ceil(this.filteredBeneficiarios.length / this.pageSize) || 1; }

  get paginated(): Beneficiario[] {
    const dir = this.sort.direction === 'asc' ? 1 : -1;
    const sorted = [...this.filteredBeneficiarios].sort((a, b) => {
      const av = this.sortValue(a);
      const bv = this.sortValue(b);
      const ac = this.toComparable(av);
      const bc = this.toComparable(bv);
      if (ac < bc) return -dir;
      return ac > bc ? dir : 0;
    });
    return sorted.slice(this.start, this.end);
  }

  private sortValue(b: Beneficiario): unknown {
    switch (this.sort.key) {
      case 'folio': return b.folio;
      case 'nombre': return `${b.nombre} ${b.apellidoPaterno} ${b.apellidoMaterno}`;
      case 'tipoEspina': return (b.tiposEspina || []).map((te) => te.nombre).join(', ');
      case 'cuota': return (b.tipoCuota || '').replace(/cuota\s*/i, '').trim();
      case 'membresia': return `${b.membresiaEstatus} ${b.fechaVencimientoMembresia || ''}`;
      case 'fechaAlta': return b.fechaAlta;
      default: return b.folio;
    }
  }

  private toComparable(value: unknown): number | string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    const text = String(value).trim(); // NOSONAR
    const maybeDate = Date.parse(text);
    if (!Number.isNaN(maybeDate) && /\d{4}-\d{2}-\d{2}/.test(text)) return maybeDate;
    const maybeNumber = Number(text);
    if (!Number.isNaN(maybeNumber) && text !== '') return maybeNumber;
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  toggleSort(key: string): void {
    if (this.sort.key === key) {
      this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = { key, direction: 'asc' };
    }
    this.page = 1;
  }

  getSortIndicator(key: string): string {
    if (this.sort.key !== key) return '-';
    return this.sort.direction === 'asc' ? '^' : 'v';
  }

  // ──────────── Export ────────────

  exportarCSV(): void {
    const filters: Record<string, string> = {};
    if (this.searchTerm) filters['busqueda'] = this.searchTerm;
    this.api.exportarBeneficiariosExcel(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => this.descargarArchivo(blob, `beneficiarios_${new Date().toISOString().slice(0, 10)}.xlsx`),
        error: () => this.toast.show('Error al exportar', 'error')
      });
  }

  private descargarArchivo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS);
  }

  // ──────────── Modal event handlers ────────────

  openNuevoModal(): void { this.showNuevoModal = true; }

  onNuevoCreado(): void {
    this.showNuevoModal = false;
    this.loadBeneficiarios();
  }

  verDetalle(b: Beneficiario): void { this.beneficiarioParaDetalle = b; }

  onEditarRequest(b: Beneficiario): void {
    this.beneficiarioParaDetalle = null;
    this.beneficiarioParaEditar = b;
  }

  onHistorialRequest(b: Beneficiario): void {
    this.beneficiarioParaDetalle = null;
    this.beneficiarioParaHistorial = b;
  }

  onCredencialRequest(b: Beneficiario): void {
    this.beneficiarioParaDetalle = null;
    this.beneficiarioParaCredencial = b;
  }

  onGuardado(): void {
    this.beneficiarioParaEditar = null;
    this.loadBeneficiarios();
  }

  onFotoActualizada(event: { idPaciente: number; fotoUrl: string }): void {
    const beneficiario = this.beneficiarios.find((b) => b.idPaciente === event.idPaciente);
    if (beneficiario) this.cargarFotosBeneficiarios([beneficiario]);
  }

  confirmarDesactivar(b: Beneficiario): void { this.beneficiarioParaDesactivar = b; }

  onDesactivado(): void {
    this.beneficiarioParaDesactivar = null;
    this.loadBeneficiarios();
    this.desactivado.emit();
  }

  abrirRenovarModal(b: Beneficiario): void { this.beneficiarioParaRenovar = b; }

  onRenovado(): void {
    this.beneficiarioParaRenovar = null;
    this.loadBeneficiarios();
    this.loadAlertasMembresia();
  }

  verCredencial(b: Beneficiario): void { this.beneficiarioParaCredencial = b; }

  // ──────────── Menú contextual ────────────

  private getActionMenuPosition(triggerRect: DOMRect): { top: number; left: number } {
    const vp = this.actionMenuViewportPadding;
    const preferredTop = triggerRect.bottom + this.actionMenuGap;
    const maxTop = Math.max(vp, window.innerHeight - this.actionMenuEstimatedHeight - vp);
    const top = Math.max(vp, Math.min(preferredTop, maxTop));
    const preferredLeft = triggerRect.right - this.actionMenuWidth;
    const maxLeft = Math.max(vp, window.innerWidth - this.actionMenuWidth - vp);
    const left = Math.min(Math.max(vp, preferredLeft), maxLeft);
    return { top, left };
  }

  private repositionOpenActionMenu(): void {
    if (!this.openActionMenu || !this.actionMenuTriggerElement) return;
    if (!document.body.contains(this.actionMenuTriggerElement)) { this.closeActionMenu(); return; }
    this.menuPosition = this.getActionMenuPosition(this.actionMenuTriggerElement.getBoundingClientRect());
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.repositionOpenActionMenu(); }

  toggleActionMenu(b: Beneficiario, event: MouseEvent): void {
    if (this.openActionMenu === b.folio) { this.closeActionMenu(); return; }
    this.actionMenuTriggerElement = event.currentTarget as HTMLElement;
    this.menuPosition = this.getActionMenuPosition(this.actionMenuTriggerElement.getBoundingClientRect());
    this.openActionMenu = b.folio;
    this.menuBeneficiario = b;
    event.stopPropagation();
  }

  closeActionMenu(): void {
    this.openActionMenu = null;
    this.menuBeneficiario = null;
    this.actionMenuTriggerElement = null;
  }
}
