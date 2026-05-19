import { Beneficiario, CobroResumen } from './activos-tab.types';

export function getMembresiaBadgeClass(membresia: string): string {
  const base = 'px-3 py-1 rounded-full text-xs font-bold';
  if (membresia === 'ACTIVO') return `${base} bg-green-100 text-green-800`;
  if (membresia === 'VENCIDO') return `${base} bg-red-100 text-red-800`;
  if (membresia === 'SUSPENDIDO') return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-800`;
}

export function getDiasParaVencer(b: Beneficiario): number {
  if (!b.fechaVencimientoMembresia) return 999;
  const venc = new Date(b.fechaVencimientoMembresia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMembresiaVencimientoClass(b: Beneficiario): string {
  if (b.membresiaEstatus === 'VENCIDO') return 'text-red-600';
  const dias = getDiasParaVencer(b);
  if (dias <= 30) return 'text-amber-600';
  return 'text-slate-400';
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export function formatMoney(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return '$0.00';
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function hasPendingAmount(value: number | string | null | undefined): boolean {
  const amount = Number(value ?? 0);
  return !Number.isNaN(amount) && amount > 0;
}

export function esImagen(formato: string | undefined): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes((formato || '').toLowerCase());
}

export function getCitaStatusLabel(status: string | null | undefined): string {
  const n = String(status || '').toUpperCase();
  if (n === 'PROGRAMADA') return 'Programada';
  if (n === 'COMPLETADA') return 'Completada';
  if (n === 'CANCELADA') return 'Cancelada';
  return n || 'Sin estatus';
}

export function getCitaStatusClass(status: string | null | undefined): string {
  const base = 'px-3 py-1 rounded-full text-xs font-bold';
  const n = String(status || '').toUpperCase();
  if (n === 'COMPLETADA') return `${base} bg-emerald-100 text-emerald-700`;
  if (n === 'CANCELADA') return `${base} bg-red-100 text-red-700`;
  if (n === 'PROGRAMADA') return `${base} bg-blue-100 text-blue-700`;
  return `${base} bg-slate-100 text-slate-700`;
}

export function getPagoStatusLabel(pago: CobroResumen): string {
  if (pago?.cancelada === 'S') return 'Cancelado';
  if (Number(pago?.saldo_pendiente || 0) > 0) return 'Con saldo';
  return 'Pagado';
}

export function getPagoStatusClass(pago: CobroResumen): string {
  const base = 'px-3 py-1 rounded-full text-xs font-bold';
  if (pago?.cancelada === 'S') return `${base} bg-red-100 text-red-700`;
  if (Number(pago?.saldo_pendiente || 0) > 0) return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-emerald-100 text-emerald-700`;
}

export function getComodatoStatusLabel(status: string | null | undefined): string {
  const n = String(status || '').toUpperCase();
  if (n === 'ACTIVO') return 'Activo';
  if (n === 'DEVUELTO') return 'Devuelto';
  if (n === 'VENCIDO') return 'Vencido';
  return n || 'Sin estatus';
}

export function getComodatoStatusClass(status: string | null | undefined): string {
  const base = 'px-3 py-1 rounded-full text-xs font-bold';
  const n = String(status || '').toUpperCase();
  if (n === 'DEVUELTO') return `${base} bg-emerald-100 text-emerald-700`;
  if (n === 'VENCIDO') return `${base} bg-red-100 text-red-700`;
  if (n === 'ACTIVO') return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-slate-100 text-slate-700`;
}
