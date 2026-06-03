export interface ProductoItem {
  idProducto: number;
  claveInterna: string;
  nombre: string;
  descripcion: string;
  tipoProducto: string;
  precioA: number | null;
  precioB: number | null;
  activo: string;
  presentacion?: string;
  dosis?: string;
  numeroSerie?: string;
  marca?: string;
  modelo?: string;
  estatusEquipo?: string;
  observaciones?: string;
  cantidadDisponible: number | null;
  nivelMinimo: number | null;
  unidadMedida: string;
  // Variantes (calibres, tallas, etc.)
  idProductoPadre?: number | null;
  nombreVariante?: string | null;
  variantes?: ProductoItem[];
}

export interface ServicioItem {
  idServicio: number;
  nombre: string;
  descripcion: string;
  cuotaRecuperacion: number;
  precioA: number | null;
  precioB: number | null;
  activo: string;
  categoria: string;
}

export interface ComodatoItem {
  idComodato: number;
  folioComodato: string;
  idEquipo: number;
  nombreEquipo: string;
  idPaciente: number;
  nombrePaciente: string;
  folioPaciente: string;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  estatus: string;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  exentoPago: string;
  notas?: string;
}

export interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatCurrency(value: unknown): string {
  const n = toNumberOrNull(value);
  return n === null ? '—' : `$${n.toFixed(2)}`;
}

export function toComparableValue(value: unknown): number | string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  const text = String(value).trim(); // NOSONAR
  const maybeDate = Date.parse(text);
  if (!Number.isNaN(maybeDate) && /\d{4}-\d{2}-\d{2}/.test(text)) return maybeDate;
  const maybeNumber = Number(text);
  if (!Number.isNaN(maybeNumber) && text !== '') return maybeNumber;
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function sortRows<T>(
  rows: T[],
  sort: TableSortState,
  valueGetter: (row: T, key: string) => unknown,
): T[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const l = toComparableValue(valueGetter(a, sort.key));
    const r = toComparableValue(valueGetter(b, sort.key));
    if (l < r) return -dir;
    if (l > r) return dir;
    return 0;
  });
}
