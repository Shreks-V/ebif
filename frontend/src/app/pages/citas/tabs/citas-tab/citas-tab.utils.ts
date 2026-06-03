export function toMXDate(fechaHora: string): Date {
  const clean = fechaHora.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(fechaHora)
    ? fechaHora : fechaHora + '-06:00';
  return new Date(clean);
}

export function getHoraCita(fechaHora: string): string {
  if (!fechaHora) return '';
  return toMXDate(fechaHora)
    .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Monterrey' });
}

export function getFechaCita(fechaHora: string): string {
  if (!fechaHora) return '';
  return toMXDate(fechaHora)
    .toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Monterrey' });
}

export function formatFechaHoraCita(fechaHora: string): string {
  if (!fechaHora) return '';
  return toMXDate(fechaHora)
    .toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Monterrey' });
}

export function getEstadoBadgeClass(estatus: string): string {
  switch (estatus) {
    case 'COMPLETADA': return 'bg-green-100 text-green-800 border-green-200';
    case 'EN_CURSO': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PROGRAMADA': return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'CANCELADA': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
