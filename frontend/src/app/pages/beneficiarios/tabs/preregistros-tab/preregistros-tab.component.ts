import { Component, DestroyRef, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PreregistroApiService } from '../../../../services/preregistro-api.service';
import { DownloadService } from '../../../../services/download.service';
import { Documento, PreRegistro } from '../../../../shared/models/preregistro.models';
import { CuotaBadgeComponent } from '../../../../shared/components/cuota-badge/cuota-badge.component';
import { AvatarInicialesComponent } from '../../../../shared/components/avatar-iniciales/avatar-iniciales.component';
import { getMunicipiosParaEstado } from '../../../../shared/data/mexico-municipios';
import { ESTADOS_MEXICANOS } from '../../../../shared/data/mexico-estados';
import { KeyboardClickDirective } from '../../../../shared/directives/keyboard-click.directive';

interface Preregistro {
  id: number;
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  genero: string;
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
  tipoSangre: string;
  usaValvula: string;
  notasAdicionales: string;
  tipoCuota: string;
  fechaSolicitud: string;
  estatus: string;
  iniciales: string;
  color: string;
}

interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface PreregistroEditForm {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  genero: string;
  curp: string;
  estado_nacimiento: string;
  hospital_nacimiento: string;
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
  tipo_cuota: string;
  notas_adicionales: string;
  paso_actual: number;
}

@Component({
  selector: 'app-preregistros-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CuotaBadgeComponent, AvatarInicialesComponent, KeyboardClickDirective],
  templateUrl: './preregistros-tab.component.html',
})
export class PreregistrosTabComponent implements OnInit {
  @Output() countChange = new EventEmitter<number>();
  @Output() aprobado = new EventEmitter<void>();

  searchTerm = '';
  preregistros: Preregistro[] = [];
  filteredPreregistros: Preregistro[] = [];
  page = 1;
  readonly pageSize = 20;
  sort: TableSortState = { key: 'id', direction: 'asc' };

  showDetalleModal = false;
  preregistroSeleccionado: Preregistro | null = null;
  documentosPreregistro: Documento[] = [];
  loadingDocumentos = false;
  descargandoDocId: number | null = null;

  showAprobarModal = false;
  preregistroAProbar: Preregistro | null = null;
  aprobarCuotaSeleccionada = '';
  submittingAprobacion = false;

  showEditModal = false;
  editData: PreregistroEditForm | null = null;
  editUsaValvula = false;
  editingId: number | null = null;
  submittingEdit = false;
  editError = '';

  readonly estadosMexicanos = ESTADOS_MEXICANOS;
  readonly tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  getMunicipiosParaEstado(estado: string): readonly string[] {
    return getMunicipiosParaEstado(estado);
  }

  private readonly avatarColors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400',
    'bg-rose-400', 'bg-indigo-400', 'bg-orange-400', 'bg-teal-400',
    'bg-cyan-400', 'bg-amber-400'
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly preregistroApi: PreregistroApiService,
    private readonly downloadService: DownloadService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private _mapToViewModel(item: PreRegistro, index: number): Preregistro {
    return {
      id: item.id_paciente,
      folio: item.folio || '',
      nombre: item.nombre,
      apellidoPaterno: item.apellido_paterno,
      apellidoMaterno: item.apellido_materno || '',
      fechaNacimiento: item.fecha_nacimiento || '',
      genero: item.genero || '',
      curp: item.curp || '',
      nombrePadreMadre: item.nombre_padre_madre || '',
      direccion: item.direccion || '',
      colonia: item.colonia || '',
      ciudad: item.ciudad || '',
      estado: item.estado || '',
      codigoPostal: item.codigo_postal || '',
      telefonoCasa: item.telefono_casa || '',
      telefonoCelular: item.telefono_celular || '',
      correoElectronico: item.correo_electronico || '',
      enEmergenciaAvisarA: item.en_emergencia_avisar_a || '',
      telefonoEmergencia: item.telefono_emergencia || '',
      tipoSangre: item.tipo_sangre || '',
      usaValvula: item.usa_valvula || 'N',
      notasAdicionales: item.notas_adicionales || '',
      tipoCuota: item.tipo_cuota || '',
      fechaSolicitud: item.fecha_registro || '',
      estatus: item.estatus_registro || '',
      iniciales: (item.nombre?.charAt(0) || '') + (item.apellido_paterno?.charAt(0) || ''),
      color: this.avatarColors[index % this.avatarColors.length],
    };
  }

  private load(): void {
    this.preregistroApi.getPreRegistros()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.preregistros = data.map((item, i) => this._mapToViewModel(item, i));
          this.filter();
        },
        error: (err) => console.error('Error loading preregistros:', err),
      });
  }

  filter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredPreregistros = this.preregistros.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.apellidoPaterno.toLowerCase().includes(term) ||
      p.apellidoMaterno.toLowerCase().includes(term) ||
      p.id.toString().includes(term) ||
      p.curp.toLowerCase().includes(term) ||
      p.tipoCuota.toLowerCase().includes(term)
    );
    this.page = 1;
    this.countChange.emit(this.filteredPreregistros.length);
  }

  get start(): number { return (this.page - 1) * this.pageSize; }
  get end(): number { return Math.min(this.start + this.pageSize, this.filteredPreregistros.length); }
  get totalPages(): number { return Math.ceil(this.filteredPreregistros.length / this.pageSize) || 1; }

  get paginated(): Preregistro[] {
    const dir = this.sort.direction === 'asc' ? 1 : -1;
    const sorted = [...this.filteredPreregistros].sort((a, b) => {
      const av = this.sortValue(a);
      const bv = this.sortValue(b);
      if (av < bv) return -dir;
      return av > bv ? dir : 0;
    });
    return sorted.slice(this.start, this.end);
  }

  private sortValue(p: Preregistro): string | number {
    switch (this.sort.key) {
      case 'id': return p.id;
      case 'nombre': return `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno}`.toLowerCase();
      case 'estatus': return p.estatus;
      case 'cuota': return (p.tipoCuota || '').replace(/cuota\s*/i, '').trim();
      case 'fechaSolicitud': return p.fechaSolicitud;
      default: return p.id;
    }
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

  verDetalle(p: Preregistro): void {
    this.preregistroSeleccionado = p;
    this.documentosPreregistro = [];
    this.loadingDocumentos = true;
    this.showDetalleModal = true;
    this.preregistroApi.getDocumentos(p.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (docs) => { this.documentosPreregistro = docs; this.loadingDocumentos = false; },
        error: () => { this.loadingDocumentos = false; },
      });
  }

  closeDetalle(): void {
    this.showDetalleModal = false;
    this.preregistroSeleccionado = null;
    this.documentosPreregistro = [];
    this.descargandoDocId = null;
  }

  descargarDoc(doc: Documento): void {
    if (!this.preregistroSeleccionado || this.descargandoDocId === doc.id_documento) return;
    this.descargandoDocId = doc.id_documento;
    this.preregistroApi.getDocumentoBlob(this.preregistroSeleccionado.id, doc.id_documento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.downloadService.downloadBlob(blob, doc.nombre_archivo || `documento-${doc.id_documento}`);
          this.descargandoDocId = null;
        },
        error: () => { this.descargandoDocId = null; },
      });
  }

  abrirModalAprobacion(p: Preregistro): void {
    this.preregistroAProbar = p;
    this.aprobarCuotaSeleccionada = p.tipoCuota || '';
    this.submittingAprobacion = false;
    this.showAprobarModal = true;
  }

  confirmarAprobacion(): void {
    if (!this.preregistroAProbar || !this.aprobarCuotaSeleccionada) return;
    this.submittingAprobacion = true;
    this.preregistroApi.aprobarPreRegistro(this.preregistroAProbar.id, this.aprobarCuotaSeleccionada)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showAprobarModal = false;
          this.preregistros = this.preregistros.filter(item => item.id !== this.preregistroAProbar!.id);
          this.preregistroAProbar = null;
          this.filter();
          this.aprobado.emit();
        },
        error: (err) => {
          console.error('Error al aprobar:', err);
          this.submittingAprobacion = false;
        },
      });
  }

  rechazar(p: Preregistro): void {
    this.preregistroApi.rechazarPreRegistro(p.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.preregistros = this.preregistros.filter(item => item.id !== p.id);
          this.filter();
        },
        error: (err) => console.error('Error al rechazar:', err),
      });
  }

  editar(p: Preregistro): void {
    this.editingId = p.id;
    this.editError = '';
    this.submittingEdit = false;

    this.preregistroApi.getPreRegistro(p.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.editData = {
            nombre: data?.nombre || p.nombre,
            apellido_paterno: data?.apellido_paterno || p.apellidoPaterno,
            apellido_materno: data?.apellido_materno || p.apellidoMaterno || '',
            fecha_nacimiento: this.toInputDate(data?.fecha_nacimiento || p.fechaNacimiento),
            genero: data?.genero || '',
            curp: data?.curp || p.curp,
            estado_nacimiento: data?.estado_nacimiento || data?.estado || '',
            hospital_nacimiento: data?.hospital_nacimiento || '',
            nombre_padre_madre: data?.nombre_padre_madre || p.nombrePadreMadre || '',
            direccion: data?.direccion || '',
            colonia: data?.colonia || '',
            ciudad: data?.ciudad || '',
            estado: data?.estado || '',
            codigo_postal: data?.codigo_postal || '',
            telefono_casa: data?.telefono_casa || '',
            telefono_celular: data?.telefono_celular || '',
            correo_electronico: data?.correo_electronico || '',
            en_emergencia_avisar_a: data?.en_emergencia_avisar_a || '',
            telefono_emergencia: data?.telefono_emergencia || '',
            tipo_sangre: data?.tipo_sangre || '',
            tipo_cuota: data?.tipo_cuota || p.tipoCuota || 'CUOTA A',
            notas_adicionales: data?.notas_adicionales || '',
            paso_actual: data?.paso_actual ?? 5,
          } satisfies PreregistroEditForm;
          this.editUsaValvula = data?.usa_valvula === 'S';
          this.showEditModal = true;
        },
        error: (err) => console.error('Error al cargar detalle de preregistro:', err),
      });
  }

  guardarEdicion(): void {
    if (!this.editingId || !this.editData) return;
    if (!this.editData.nombre || !this.editData.apellido_paterno || !this.editData.curp) {
      this.editError = 'Nombre, apellido paterno y CURP son obligatorios.';
      return;
    }

    this.submittingEdit = true;
    this.editError = '';

    const payload = {
      nombre: this.editData.nombre,
      apellido_paterno: this.editData.apellido_paterno,
      apellido_materno: this.editData.apellido_materno || null,
      fecha_nacimiento: this.editData.fecha_nacimiento || null,
      genero: this.editData.genero || null,
      curp: this.editData.curp,
      estado_nacimiento: this.editData.estado_nacimiento || this.editData.estado || null,
      hospital_nacimiento: this.editData.hospital_nacimiento || null,
      nombre_padre_madre: this.editData.nombre_padre_madre || null,
      direccion: this.editData.direccion || null,
      colonia: this.editData.colonia || null,
      ciudad: this.editData.ciudad || null,
      estado: this.editData.estado || null,
      codigo_postal: this.editData.codigo_postal || null,
      telefono_casa: this.editData.telefono_casa || null,
      telefono_celular: this.editData.telefono_celular || null,
      correo_electronico: this.editData.correo_electronico || null,
      en_emergencia_avisar_a: this.editData.en_emergencia_avisar_a || null,
      telefono_emergencia: this.editData.telefono_emergencia || null,
      tipo_sangre: this.editData.tipo_sangre || null,
      usa_valvula: this.editUsaValvula ? 'S' : 'N',
      tipo_cuota: this.editData.tipo_cuota || null,
      notas_adicionales: this.editData.notas_adicionales || null,
      paso_actual: this.editData.paso_actual || 5,
      tipos_espina: null,
    };

    this.preregistroApi.updatePreRegistro(this.editingId, payload as Partial<PreRegistro>)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submittingEdit = false;
          this.showEditModal = false;
          this.editData = null;
          this.editingId = null;
          this.load();
        },
        error: (err) => {
          this.submittingEdit = false;
          this.editError = err?.error?.detail || 'Error al actualizar pre-registro.';
          console.error('Error al actualizar pre-registro:', err);
        },
      });
  }

  private toInputDate(value: string | null | undefined): string {
    if (!value) return '';
    return value.includes('T') ? value.split('T')[0] : value;
  }
}
