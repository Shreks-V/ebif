import { Injectable } from '@angular/core';
import { OcrResult } from './ocr-api.service';

@Injectable({ providedIn: 'root' })
export class OcrMergeService {
  normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  toTitleCase(s: string): string {
    return s.toLowerCase().replace(/(?:^|\s|\/|-)[a-záéíóúüñ]/g, c => c.toUpperCase());
  }

  mergeResults(results: OcrResult[]): OcrResult {
    const base: OcrResult = {
      tipo_documento: null, nombre: null, apellido_paterno: null, apellido_materno: null,
      fecha_nacimiento: null, sexo: null, curp: null, estado_nacimiento: null,
      calle: null, numero_exterior: null, numero_interior: null, colonia: null,
      municipio: null, estado_residencia: null, codigo_postal: null,
      nombre_padre: null, nombre_madre: null, confianza: 'alta', campos_detectados: null,
    };
    const keys = Object.keys(base) as (keyof OcrResult)[];
    for (const key of keys) {
      for (const r of results) {
        if (r[key] !== null && r[key] !== undefined) {
          (base as unknown as Record<string, unknown>)[key] = r[key];
          break;
        }
      }
    }
    return base;
  }

  autoSelectTipoId(
    ocrTipoDocumento: string,
    tiposDocumento: { id_tipo_documento: number; nombre: string }[],
    aliases: Record<string, string[]>,
  ): number | null {
    const normalized = this.normalize(ocrTipoDocumento);
    const searchTerms = aliases[normalized] ?? [normalized];
    for (const td of tiposDocumento) {
      const dbName = this.normalize(td.nombre);
      if (searchTerms.some(t => dbName.includes(t) || t.includes(dbName))) {
        return td.id_tipo_documento;
      }
    }
    return null;
  }
}
