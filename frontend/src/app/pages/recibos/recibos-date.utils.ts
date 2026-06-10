export function formatReciboDateOnly(fecha?: string | null): string {
  const value = String(fecha ?? '').trim();
  if (!value) return '';

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const slashDate = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
  if (slashDate) return `${slashDate[1]}/${slashDate[2]}/${slashDate[3]}`;

  return value.split(/[T ]/)[0];
}
