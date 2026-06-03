export function getApiError(err: unknown, fallback = 'Error inesperado'): string {
  const e = err as { error?: { detail?: string }; message?: string };
  return e?.error?.detail ?? e?.message ?? fallback;
}
