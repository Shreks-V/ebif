import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { CuotaBadgeComponent } from '../../../../shared/components/cuota-badge/cuota-badge.component';
import { AvatarInicialesComponent } from '../../../../shared/components/avatar-iniciales/avatar-iniciales.component';
import { getMunicipiosParaEstado } from '../../../../shared/data/mexico-municipios';
import { PAISES } from '../../../../shared/data/paises';

interface Beneficiario {
  idPaciente: number;
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  genero: string;
  fechaNacimiento: string;
  curp: string;
  nombrePadreMadre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefonoCasa: string;
  telefonoCelular: string;
  correoElectronico: string;
  enEmergenciaAvisarA: string;
  telefonoEmergencia: string;
  municipioNacimiento: string;
  estadoNacimiento: string;
  hospitalNacimiento: string;
  tipoSangre: string;
  usaValvula: string;
  notasAdicionales: string;
  fechaAlta: string;
  membresiaEstatus: string;
  tipoCuota: string;
  activo: string;
  tiposEspina: {idTipoEspina: number, nombre: string}[];
  fechaInicioMembresia: string | null;
  fechaVencimientoMembresia: string | null;
  fotoUrl: string | null;
  iniciales: string;
  color: string;
}

interface NuevoBeneficiarioDocumento {
  id_tipo_documento: number;
  archivo: File | null;
}

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface TipoDocumento {
  id_tipo_documento: number;
  nombre: string;
  descripcion: string;
}

interface TipoEspinaCatalogo {
  id_tipo_espina: number;
  nombre: string;
}

interface Documento {
  id_documento: number;
  nombre_archivo: string;
  formato_archivo: string;
  tipo_nombre: string;
  fecha_carga: string;
}

interface CobroResumen {
  id_venta: number;
  folio_venta: string;
  fecha_venta: string;
  monto_total: number;
  saldo_pendiente: number;
  cancelada: string;
  motivo_cancelacion?: string;
}

interface CitaHistorial {
  fecha_hora: string;
  estatus: string;
  notas: string;
  servicios: { nombre: string; cantidad: number; monto_pagado: number; cancelado: string }[];
  doctores: { nombre_doctor: string; especialidad: string }[];
}

interface HistorialData {
  nombre: string;
  citas: CitaHistorial[];
  pagos: CobroResumen[];
  comodatos: {
    nombre_equipo: string;
    folio_comodato: string;
    estatus: string;
    fecha_prestamo: string;
    fecha_devolucion: string | null;
    monto_total: number | null;
    saldo_pendiente: number | null;
  }[];
}

interface BeneficiarioFormData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  genero: string;
  fecha_nacimiento: string;
  curp: string;
  nombre_padre_madre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  telefono_casa: string;
  telefono_celular: string;
  correo_electronico: string;
  en_emergencia_avisar_a: string;
  telefono_emergencia: string;
  tipo_sangre: string;
  usa_valvula: string;
  tipo_cuota: string;
  membresia_estatus: string;
}

interface BeneficiarioEditFormData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  genero: string;
  fecha_nacimiento: string;
  curp: string;
  nombre_padre_madre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  telefono_casa: string;
  telefono_celular: string;
  correo_electronico: string;
  en_emergencia_avisar_a: string;
  telefono_emergencia: string;
  tipo_sangre: string;
  notas_adicionales: string;
  membresia_estatus: string;
  tipo_cuota: string;
}

@Component({
  selector: 'app-activos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CuotaBadgeComponent, AvatarInicialesComponent],
  templateUrl: './activos-tab.component.html',
})
export class ActivosTabComponent implements OnInit, OnDestroy {
  @Input() isAdmin = false;
  @Output() countChange = new EventEmitter<number>();

  loading = true;
  beneficiarios: Beneficiario[] = [];
  filteredBeneficiarios: Beneficiario[] = [];
  searchTerm = '';
  page = 1;
  readonly pageSize = 20;
  sort: TableSortState = { key: 'folio', direction: 'asc' };

  // Alertas membresía
  membresiasProximasCount = 0;

  // Modal: Nuevo Beneficiario
  showNuevoModal = false;
  submittingNuevo = false;
  nuevoError = '';
  formDataPais = 'México';
  formData: BeneficiarioFormData = {
    nombre: '', apellido_paterno: '', apellido_materno: '', genero: '',
    fecha_nacimiento: '', curp: '', nombre_padre_madre: '', direccion: '',
    colonia: '', ciudad: '', estado: '', codigo_postal: '', telefono_casa: '',
    telefono_celular: '', correo_electronico: '', en_emergencia_avisar_a: '',
    telefono_emergencia: '', tipo_sangre: '', usa_valvula: 'N', tipo_cuota: '', membresia_estatus: ''
  };
  formDataUsaValvula = false;
  formDataTiposEspina: number[] = [];
  tiposDocumentoCatalogo: TipoDocumento[] = [];
  tiposEspinaCatalogo: TipoEspinaCatalogo[] = [];
  nuevoBeneficiarioDocumentos: NuevoBeneficiarioDocumento[] = [{ id_tipo_documento: 0, archivo: null }];

  // Modal: Detalle Beneficiario
  showDetalleModal = false;
  beneficiarioSeleccionado: Beneficiario | null = null;
  detalleTab: 'datos' | 'contacto' | 'medico' | 'cobros' | 'documentos' = 'datos';
  detalleDocumentos: Documento[] = [];
  detalleDocumentosLoading = false;
  detalleCobros: CobroResumen[] = [];
  detalleCobrosLoading = false;

  // Modal: Editar Beneficiario (multi-step)
  showEditModal = false;
  editFormData: BeneficiarioEditFormData | null = null;
  editFormDataPais = 'México';
  editFormDataUsaValvula = false;
  editFormDataTiposEspina: number[] = [];
  editFolio = '';
  submittingEdit = false;
  editError = '';
  editFotoFile: File | null = null;
  editFotoPreviewUrl: string | null = null;
  editStep = 1;
  readonly editSteps = ['Datos Personales', 'Dirección', 'Contacto', 'Info. Médica', 'Membresía'];

  // Modal: Historial
  showHistorialModal = false;
  historialData: HistorialData | null = null;
  historialLoading = false;
  historialTab: 'citas' | 'pagos' | 'comodatos' = 'citas';

  // Modal: Confirmar Desactivar
  showConfirmDesactivar = false;
  beneficiarioADesactivar: Beneficiario | null = null;

  // Modal: Renovar Membresía
  showRenovarModal = false;
  beneficiarioARenovar: Beneficiario | null = null;
  renovarMonto = 0;
  renovarExento = 'N';
  renovarMetodosPago: { id_metodo_pago: number; monto: number }[] = [{ id_metodo_pago: 0, monto: 0 }];
  renovarMetodosCatalogo: { id: number; nombre: string }[] = [];
  renovarError = '';
  renovarSubmitting = false;

  // Modal: Credencial
  showCredencialModal = false;
  credencialBeneficiario: Beneficiario | null = null;

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

  readonly estadosMexicanos = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima', 'Durango',
    'Estado de Mexico', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'Michoacan', 'Morelos', 'Nayarit', 'Nuevo Leon', 'Oaxaca',
    'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
    'Yucatan', 'Zacatecas'
  ];
  readonly paises = PAISES;
  readonly tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  getMunicipiosParaEstado(estado: string): readonly string[] {
    return getMunicipiosParaEstado(estado);
  }

  private readonly avatarColors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400',
    'bg-rose-400', 'bg-indigo-400', 'bg-orange-400', 'bg-teal-400',
    'bg-cyan-400', 'bg-amber-400'
  ];

  private readonly CURP_REGEX = /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;

  private _refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.loadBeneficiarios();
    this.loadTiposDocumentoCatalogo();
    this.loadAlertasMembresia();
    this.resetFormData();
    this._refreshTimer = setInterval(() => this.loadBeneficiarios(), 60_000);

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'nuevo') this.openNuevoModal();
    });

    window.visualViewport?.addEventListener('resize', this.onViewportGeometryChange, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.onViewportGeometryChange, { passive: true });
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this.onViewportGeometryChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportGeometryChange);
    if (this._refreshTimer) clearInterval(this._refreshTimer);
  }

  // ──────────── Data loading ────────────

  private loadBeneficiarios(): void {
    this.loading = true;
    this.api.getBeneficiarios({ membresia_estatus: 'ACTIVO' }).subscribe({
      next: (data) => {
        this.beneficiarios = data.map((item: any, index: number) => ({
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
          tiposEspina: (item.tipos_espina || []).map((te: any) => ({
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

  private loadTiposDocumentoCatalogo(): void {
    this.api.getTiposDocumentoPublic().subscribe({
      next: (data) => { this.tiposDocumentoCatalogo = data || []; },
      error: (err) => console.error('Error al cargar tipos de documento:', err)
    });
  }

  private loadAlertasMembresia(): void {
    this.api.getMembresiasProximasAVencer(30).subscribe({
      next: (data: any[]) => { this.membresiasProximasCount = data.length; },
      error: () => { this.membresiasProximasCount = 0; }
    });
  }

  // ──────────── Fotos ────────────

  private getFotoTipoDocumentoId(): number {
    const tipo = this.tiposDocumentoCatalogo.find((item: any) => {
      const texto = `${String(item?.nombre || '').toLowerCase()} ${String(item?.descripcion || '').toLowerCase()}`;
      return texto.includes('foto') || texto.includes('fotografia') || texto.includes('imagen');
    });
    const id = Number(tipo?.id_tipo_documento || 0);
    return Number.isFinite(id) ? id : 0;
  }

  private getTipoDocumentoFotoUploadId(): number {
    const tipoFoto = this.getFotoTipoDocumentoId();
    if (tipoFoto > 0) return tipoFoto;
    const fallback = Number(this.tiposDocumentoCatalogo?.[0]?.id_tipo_documento || 0);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  private esFormatoImagen(formato: any): boolean {
    return ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(String(formato || '').trim().toUpperCase());
  }

  private obtenerFechaDocumento(valor: any): number {
    if (!valor) return 0;
    const ms = new Date(valor).getTime();
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
    this.beneficiarios = this.beneficiarios.map((b) =>
      b.idPaciente === idPaciente ? { ...b, fotoUrl } : b
    );
    this.filteredBeneficiarios = this.filteredBeneficiarios.map((b) =>
      b.idPaciente === idPaciente ? { ...b, fotoUrl } : b
    );
    if (this.beneficiarioSeleccionado?.idPaciente === idPaciente) {
      this.beneficiarioSeleccionado = { ...this.beneficiarioSeleccionado, fotoUrl };
    }
    if (this.credencialBeneficiario?.idPaciente === idPaciente) {
      this.credencialBeneficiario = { ...this.credencialBeneficiario, fotoUrl };
    }
  }

  private cargarFotosBeneficiarios(items: Beneficiario[]): void {
    if (!items.length) return;
    const requests = items.map((b) =>
      this.api.getDocumentos(b.idPaciente).pipe(
        map((docs: any[]) => {
          const fotoDoc = this.seleccionarDocumentoFoto(docs || []);
          const fotoUrl = fotoDoc?.id_documento
            ? this.api.getDocumentoArchivoUrl(b.idPaciente, Number(fotoDoc.id_documento))
            : null;
          return { idPaciente: b.idPaciente, fotoUrl };
        }),
        catchError(() => of({ idPaciente: b.idPaciente, fotoUrl: null }))
      )
    );
    forkJoin(requests).subscribe({
      next: (results) => results.forEach((item) => this.actualizarFotoEnVistas(item.idPaciente, item.fotoUrl)),
      error: (err) => console.error('Error al cargar fotos de beneficiarios:', err)
    });
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
      return ac < bc ? -dir : ac > bc ? dir : 0;
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
    const text = String(value).trim();
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

  // ──────────── Helpers ────────────

  getMembresiaBadgeClass(membresia: string): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    if (membresia === 'ACTIVO') return `${base} bg-green-100 text-green-800`;
    if (membresia === 'VENCIDO') return `${base} bg-red-100 text-red-800`;
    if (membresia === 'SUSPENDIDO') return `${base} bg-amber-100 text-amber-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }

  getDiasParaVencer(b: Beneficiario): number {
    if (!b.fechaVencimientoMembresia) return 999;
    const venc = new Date(b.fechaVencimientoMembresia);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  getMembresiaVencimientoClass(b: Beneficiario): string {
    if (b.membresiaEstatus === 'VENCIDO') return 'text-red-600';
    const dias = this.getDiasParaVencer(b);
    if (dias <= 30) return 'text-amber-600';
    return 'text-slate-400';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  formatMoney(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);
    if (Number.isNaN(amount)) return '$0.00';
    return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  hasPendingAmount(value: number | string | null | undefined): boolean {
    const amount = Number(value ?? 0);
    return !Number.isNaN(amount) && amount > 0;
  }

  esImagen(formato: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes((formato || '').toLowerCase());
  }

  getCitaStatusLabel(status: string | null | undefined): string {
    const n = String(status || '').toUpperCase();
    if (n === 'PROGRAMADA') return 'Programada';
    if (n === 'COMPLETADA') return 'Completada';
    if (n === 'CANCELADA') return 'Cancelada';
    return n || 'Sin estatus';
  }

  getCitaStatusClass(status: string | null | undefined): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    const n = String(status || '').toUpperCase();
    if (n === 'COMPLETADA') return `${base} bg-emerald-100 text-emerald-700`;
    if (n === 'CANCELADA') return `${base} bg-red-100 text-red-700`;
    if (n === 'PROGRAMADA') return `${base} bg-blue-100 text-blue-700`;
    return `${base} bg-slate-100 text-slate-700`;
  }

  getPagoStatusLabel(pago: CobroResumen): string {
    if (pago?.cancelada === 'S') return 'Cancelado';
    if (Number(pago?.saldo_pendiente || 0) > 0) return 'Con saldo';
    return 'Pagado';
  }

  getPagoStatusClass(pago: CobroResumen): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    if (pago?.cancelada === 'S') return `${base} bg-red-100 text-red-700`;
    if (Number(pago?.saldo_pendiente || 0) > 0) return `${base} bg-amber-100 text-amber-700`;
    return `${base} bg-emerald-100 text-emerald-700`;
  }

  getComodatoStatusLabel(status: string | null | undefined): string {
    const n = String(status || '').toUpperCase();
    if (n === 'ACTIVO') return 'Activo';
    if (n === 'DEVUELTO') return 'Devuelto';
    if (n === 'VENCIDO') return 'Vencido';
    return n || 'Sin estatus';
  }

  getComodatoStatusClass(status: string | null | undefined): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    const n = String(status || '').toUpperCase();
    if (n === 'DEVUELTO') return `${base} bg-emerald-100 text-emerald-700`;
    if (n === 'VENCIDO') return `${base} bg-red-100 text-red-700`;
    if (n === 'ACTIVO') return `${base} bg-amber-100 text-amber-700`;
    return `${base} bg-slate-100 text-slate-700`;
  }

  get detalleCobrosTotal(): number {
    return this.detalleCobros
      .filter(c => c.cancelada !== 'S')
      .reduce((sum, c) => sum + (Number(c.monto_total) || 0), 0);
  }

  get credencialPadecimiento(): string {
    const tipos = this.credencialBeneficiario?.tiposEspina;
    if (!tipos || tipos.length === 0) return '-';
    return tipos.map(t => t.nombre).join(', ');
  }

  // ──────────── Modal: Nuevo Beneficiario ────────────

  private resetFormData(): void {
    this.formData = {
      nombre: '', apellido_paterno: '', apellido_materno: '', genero: '',
      fecha_nacimiento: '', curp: '', nombre_padre_madre: '', direccion: '',
      colonia: '', ciudad: '', estado: '', codigo_postal: '', telefono_casa: '',
      telefono_celular: '', correo_electronico: '', en_emergencia_avisar_a: '',
      telefono_emergencia: '', tipo_sangre: '', usa_valvula: 'N', tipo_cuota: '', membresia_estatus: '',
    } satisfies BeneficiarioFormData;
    this.formDataPais = 'México';
    this.formDataUsaValvula = false;
    this.nuevoBeneficiarioDocumentos = [{ id_tipo_documento: 0, archivo: null }];
  }

  openNuevoModal(): void {
    this.resetFormData();
    this.nuevoError = '';
    this.formDataTiposEspina = [];
    if (this.tiposEspinaCatalogo.length === 0) {
      this.api.getTiposEspina().subscribe({
        next: (data: any[]) => { this.tiposEspinaCatalogo = data || []; },
        error: () => {}
      });
    }
    this.showNuevoModal = true;
  }

  closeNuevoModal(): void { this.showNuevoModal = false; }

  agregarDocumentoNuevoBeneficiario(): void {
    this.nuevoBeneficiarioDocumentos.push({ id_tipo_documento: 0, archivo: null });
  }

  eliminarDocumentoNuevoBeneficiario(index: number): void {
    if (this.nuevoBeneficiarioDocumentos.length === 1) {
      this.nuevoBeneficiarioDocumentos[0] = { id_tipo_documento: 0, archivo: null };
      return;
    }
    this.nuevoBeneficiarioDocumentos.splice(index, 1);
  }

  onNuevoBeneficiarioDocSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (this.nuevoBeneficiarioDocumentos[index]) {
      this.nuevoBeneficiarioDocumentos[index].archivo = file;
    }
  }

  isNuevoEspinaSelected(id: number): boolean { return this.formDataTiposEspina.includes(id); }

  toggleNuevoEspina(id: number): void {
    const idx = this.formDataTiposEspina.indexOf(id);
    if (idx >= 0) this.formDataTiposEspina.splice(idx, 1);
    else this.formDataTiposEspina.push(id);
  }

  submitNuevoBeneficiario(): void {
    if (!this.formData.nombre || !this.formData.apellido_paterno || !this.formData.genero ||
        !this.formData.fecha_nacimiento || !this.formData.curp || !this.formData.tipo_cuota ||
        !this.formData.membresia_estatus) {
      this.nuevoError = 'Por favor completa todos los campos obligatorios marcados con *.';
      return;
    }
    const curp = this.formData.curp.trim().toUpperCase();
    if (!this.CURP_REGEX.test(curp)) {
      this.nuevoError = 'El CURP debe tener 18 caracteres con formato oficial. Ejemplo: GAGJ850116HBSRPN09.';
      return;
    }
    this.formData.curp = curp;
    this.submittingNuevo = true;
    this.nuevoError = '';

    const payload = {
      ...this.formData,
      usa_valvula: this.formDataUsaValvula ? 'S' : 'N',
      tipos_espina: this.formDataTiposEspina,
    };

    const documentosValidos = this.nuevoBeneficiarioDocumentos.filter(d => d.id_tipo_documento > 0 && !!d.archivo);

    this.api.createBeneficiario(payload).subscribe({
      next: (created: any) => {
        const idPacienteCreado = created?.id_paciente;
        if (documentosValidos.length > 0 && idPacienteCreado) {
          const uploads = documentosValidos.map(doc =>
            this.api.uploadDocumento(idPacienteCreado, doc.id_tipo_documento, doc.archivo as File)
          );
          forkJoin(uploads).subscribe({
            next: () => this.finalizarAltaBeneficiario(),
            error: (err) => {
              console.error('Beneficiario creado, pero hubo error al subir documentos:', err);
              this.finalizarAltaBeneficiario();
              alert('El beneficiario se creo correctamente, pero algunos documentos no se pudieron subir.');
            }
          });
          return;
        }
        this.finalizarAltaBeneficiario();
      },
      error: (err) => {
        this.submittingNuevo = false;
        this.nuevoError = err?.error?.detail || 'Error al crear el beneficiario. Intenta de nuevo.';
        console.error('Error creating beneficiario:', err);
      }
    });
  }

  private finalizarAltaBeneficiario(): void {
    this.submittingNuevo = false;
    this.showNuevoModal = false;
    this.resetFormData();
    this.loadBeneficiarios();
  }

  // ──────────── Modal: Detalle Beneficiario ────────────

  verDetalle(b: Beneficiario): void {
    this.beneficiarioSeleccionado = b;
    this.showDetalleModal = true;
    this.detalleTab = 'datos';
    this.detalleDocumentos = [];
    this.detalleCobros = [];
    this.detalleDocumentosLoading = true;
    this.detalleCobrosLoading = true;
    this.api.getDocumentos(b.idPaciente).subscribe({
      next: (docs) => { this.detalleDocumentos = docs; this.detalleDocumentosLoading = false; },
      error: () => { this.detalleDocumentosLoading = false; }
    });
    this.api.getRecibos({ id_paciente: b.idPaciente }).subscribe({
      next: (cobros) => { this.detalleCobros = cobros || []; this.detalleCobrosLoading = false; },
      error: () => { this.detalleCobrosLoading = false; }
    });
  }

  closeDetalle(): void {
    this.showDetalleModal = false;
    this.beneficiarioSeleccionado = null;
    this.detalleDocumentos = [];
    this.detalleCobros = [];
  }

  descargarDocumento(doc: Documento): void {
    if (!this.beneficiarioSeleccionado) return;
    this.api.getDocumentoBlob(this.beneficiarioSeleccionado.idPaciente, doc.id_documento).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = doc.nombre_archivo || `documento_${doc.id_documento}`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('No se pudo descargar el documento.')
    });
  }

  // ──────────── Modal: Editar Beneficiario ────────────

  editarBeneficiario(b: Beneficiario): void {
    this.editFolio = b.folio;
    this.editFormData = {
      nombre: b.nombre, apellido_paterno: b.apellidoPaterno, apellido_materno: b.apellidoMaterno || '',
      genero: b.genero, fecha_nacimiento: b.fechaNacimiento ? b.fechaNacimiento.split('T')[0] : '',
      curp: b.curp, nombre_padre_madre: b.nombrePadreMadre || '', direccion: b.direccion || '',
      colonia: b.colonia || '', ciudad: b.ciudad || '', estado: b.estado || '',
      codigo_postal: b.codigoPostal || '', telefono_casa: b.telefonoCasa || '',
      telefono_celular: b.telefonoCelular || '', correo_electronico: b.correoElectronico || '',
      en_emergencia_avisar_a: b.enEmergenciaAvisarA || '', telefono_emergencia: b.telefonoEmergencia || '',
      tipo_sangre: b.tipoSangre || '', notas_adicionales: b.notasAdicionales || '',
      membresia_estatus: b.membresiaEstatus || 'ACTIVO', tipo_cuota: b.tipoCuota || 'CUOTA A'
    };
    this.editFormDataPais = 'México';
    this.editFormDataUsaValvula = b.usaValvula === 'S';
    this.editFormDataTiposEspina = (b.tiposEspina || []).map(te => te.idTipoEspina);
    this.editFotoFile = null;
    this.editFotoPreviewUrl = b.fotoUrl || null;
    this.editError = '';
    this.editStep = 1;
    if (this.tiposDocumentoCatalogo.length === 0) this.loadTiposDocumentoCatalogo();
    if (this.tiposEspinaCatalogo.length === 0) {
      this.api.getTiposEspina().subscribe({
        next: (data: any[]) => { this.tiposEspinaCatalogo = data || []; },
        error: () => {}
      });
    }
    this.showEditModal = true;
  }

  editNextStep(): void {
    if (!this.editFormData) return;
    if (this.editStep === 1) {
      if (!this.editFormData.nombre || !this.editFormData.apellido_paterno ||
          !this.editFormData.fecha_nacimiento || !this.editFormData.genero || !this.editFormData.curp) {
        this.editError = 'Completa los campos obligatorios (*)';
        return;
      }
    }
    this.editError = '';
    if (this.editStep < this.editSteps.length) this.editStep++;
  }

  editPrevStep(): void {
    this.editError = '';
    if (this.editStep > 1) this.editStep--;
  }

  onFotoBeneficiarioSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.editError = 'Selecciona un archivo de imagen valido.';
      (input as HTMLInputElement).value = '';
      return;
    }
    this.editError = '';
    this.editFotoFile = file;
    if (this.editFotoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.editFotoPreviewUrl);
    this.editFotoPreviewUrl = URL.createObjectURL(file);
  }

  isEditEspinaSelected(id: number): boolean { return this.editFormDataTiposEspina.includes(id); }

  toggleEditEspina(id: number): void {
    const idx = this.editFormDataTiposEspina.indexOf(id);
    if (idx >= 0) this.editFormDataTiposEspina.splice(idx, 1);
    else this.editFormDataTiposEspina.push(id);
  }

  guardarEdicionBeneficiario(): void {
    if (!this.editFormData) return;
    if (!this.editFormData.nombre || !this.editFormData.apellido_paterno || !this.editFormData.genero ||
        !this.editFormData.fecha_nacimiento || !this.editFormData.curp) {
      this.editError = 'Por favor completa todos los campos obligatorios.';
      return;
    }
    const curp = this.editFormData.curp.trim().toUpperCase();
    if (!this.CURP_REGEX.test(curp)) {
      this.editError = 'El CURP debe tener 18 caracteres con formato oficial. Ejemplo: GAGJ850116HBSRPN09.';
      return;
    }
    this.editFormData.curp = curp;
    const beneficiario = this.beneficiarios.find(item => item.folio === this.editFolio);
    if (!beneficiario) { this.editError = 'No se encontro el beneficiario a actualizar.'; return; }

    this.submittingEdit = true;
    this.editError = '';

    const payload = {
      ...this.editFormData,
      usa_valvula: this.editFormDataUsaValvula ? 'S' : 'N',
      tipos_espina: this.editFormDataTiposEspina,
    };

    this.api.updateBeneficiario(this.editFolio, payload).subscribe({
      next: () => {
        if (!this.editFotoFile) { this.finalizarEdicionBeneficiario(); return; }
        const tipoDocFoto = this.getTipoDocumentoFotoUploadId();
        if (!tipoDocFoto) {
          this.submittingEdit = false;
          this.editError = 'No se pudo preparar la carga de la foto. Recarga la página e intenta nuevamente.';
          return;
        }
        this.api.uploadDocumento(beneficiario.idPaciente, tipoDocFoto, this.editFotoFile).subscribe({
          next: (resp: any) => {
            const idDocumento = Number(resp?.id_documento || 0);
            if (idDocumento > 0) {
              this.actualizarFotoEnVistas(beneficiario.idPaciente, this.api.getDocumentoArchivoUrl(beneficiario.idPaciente, idDocumento));
            }
            this.finalizarEdicionBeneficiario();
          },
          error: (err) => {
            this.submittingEdit = false;
            this.editError = err?.error?.detail || 'Los datos se guardaron, pero no se pudo cargar la foto.';
            console.error('Error uploading beneficiario photo:', err);
            this.loadBeneficiarios();
          }
        });
      },
      error: (err) => {
        this.submittingEdit = false;
        this.editError = err?.error?.detail || 'Error al actualizar el beneficiario.';
        console.error('Error updating beneficiario:', err);
      }
    });
  }

  private finalizarEdicionBeneficiario(): void {
    this.submittingEdit = false;
    this.showEditModal = false;
    this.editFotoFile = null;
    if (this.editFotoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.editFotoPreviewUrl);
    this.editFotoPreviewUrl = null;
    this.loadBeneficiarios();
  }

  // ──────────── Modal: Historial ────────────

  verHistorial(b: Beneficiario): void {
    this.historialData = null;
    this.historialLoading = true;
    this.historialTab = 'citas';
    this.showHistorialModal = true;
    this.api.getBeneficiarioHistorial(b.folio).subscribe({
      next: (data) => { this.historialData = data; this.historialLoading = false; },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.historialLoading = false;
        this.historialData = { nombre: `${b.nombre} ${b.apellidoPaterno}`, citas: [], pagos: [], comodatos: [] };
      }
    });
  }

  // ──────────── Desactivar ────────────

  confirmarDesactivar(b: Beneficiario): void {
    this.beneficiarioADesactivar = b;
    this.showConfirmDesactivar = true;
  }

  desactivarBeneficiario(): void {
    if (!this.beneficiarioADesactivar) return;
    this.api.deleteBeneficiario(this.beneficiarioADesactivar.folio).subscribe({
      next: () => {
        this.showConfirmDesactivar = false;
        this.beneficiarioADesactivar = null;
        this.loadBeneficiarios();
      },
      error: (err) => {
        console.error('Error al desactivar beneficiario:', err);
        this.showConfirmDesactivar = false;
      }
    });
  }

  // ──────────── Renovar Membresía ────────────

  abrirRenovarModal(b: Beneficiario): void {
    this.beneficiarioARenovar = b;
    this.renovarMonto = 0;
    this.renovarExento = 'N';
    this.renovarMetodosPago = [{ id_metodo_pago: 0, monto: 0 }];
    this.renovarError = '';
    this.renovarSubmitting = false;
    if (this.renovarMetodosCatalogo.length === 0) {
      this.api.getMetodosPago().subscribe({
        next: (data: any[]) => {
          this.renovarMetodosCatalogo = data.map((m: any) => ({ id: m.id_metodo_pago || m.id, nombre: m.nombre }));
        },
        error: () => {}
      });
    }
    this.showRenovarModal = true;
  }

  confirmarRenovacion(): void {
    if (!this.beneficiarioARenovar) return;
    if (!this.renovarMonto || this.renovarMonto <= 0) { this.renovarError = 'El monto debe ser mayor a 0.'; return; }
    const metodosValidos = this.renovarMetodosPago.filter(m => m.id_metodo_pago > 0 && m.monto > 0);
    if (this.renovarExento !== 'S' && metodosValidos.length === 0) { this.renovarError = 'Agrega al menos un método de pago.'; return; }

    this.renovarSubmitting = true;
    this.renovarError = '';
    const payload = {
      monto_total: this.renovarMonto,
      exento_pago: this.renovarExento,
      metodos_pago: this.renovarExento === 'S' ? [] : metodosValidos
    };
    this.api.renovarMembresia(this.beneficiarioARenovar.folio, payload).subscribe({
      next: (res: any) => {
        this.renovarSubmitting = false;
        this.showRenovarModal = false;
        this.beneficiarioARenovar = null;
        this.loadBeneficiarios();
        this.loadAlertasMembresia();
        if (res?.folio_venta) alert(`Membresía renovada. Cobro generado: ${res.folio_venta}`);
      },
      error: (err: any) => {
        this.renovarSubmitting = false;
        this.renovarError = err?.error?.detail || 'Error al renovar la membresía.';
      }
    });
  }

  // ──────────── Credencial ────────────

  verCredencial(b: Beneficiario): void {
    this.credencialBeneficiario = b;
    this.showCredencialModal = true;
  }

  descargarCredencial(folio: string): void {
    this.api.exportarCredencialPdf(folio).subscribe({
      next: (blob) => this.abrirPdfEnNuevaTab(blob, `credencial_${folio}.pdf`),
      error: () => alert('Error al generar credencial')
    });
  }

  descargarExpediente(folio: string): void {
    this.api.exportarBeneficiarioPdf(folio).subscribe({
      next: (blob) => this.abrirPdfEnNuevaTab(blob, `expediente_${folio}.pdf`),
      error: () => alert('Error al generar expediente')
    });
  }

  exportarCSV(): void {
    const filters: Record<string, string> = {};
    if (this.searchTerm) filters['busqueda'] = this.searchTerm;
    this.api.exportarBeneficiariosExcel(filters).subscribe({
      next: (blob) => this.descargarArchivo(blob, `beneficiarios_${new Date().toISOString().slice(0, 10)}.xlsx`),
      error: () => alert('Error al exportar')
    });
  }

  private abrirPdfEnNuevaTab(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private descargarArchivo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 150);
  }

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
