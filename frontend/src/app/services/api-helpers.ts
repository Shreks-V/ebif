import { HttpParams } from '@angular/common/http';

export function buildParams(filters?: Record<string, any>): HttpParams {
  let params = new HttpParams();
  if (filters) {
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
  }
  return params;
}
