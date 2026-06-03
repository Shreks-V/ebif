import { HttpParams } from '@angular/common/http';

export function buildParams(filters?: object): HttpParams {
  let params = new HttpParams();
  if (filters) {
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== null && val !== undefined && val !== '') {
        params = params.set(key, String(val));
      }
    });
  }
  return params;
}
