import { OcrMergeService } from './ocr-merge.service';
import { OcrResult } from './ocr-api.service';

const blankResult = (): OcrResult => ({
  tipo_documento: null, nombre: null, apellido_paterno: null, apellido_materno: null,
  fecha_nacimiento: null, sexo: null, curp: null, estado_nacimiento: null,
  calle: null, numero_exterior: null, numero_interior: null, colonia: null,
  municipio: null, estado_residencia: null, codigo_postal: null,
  nombre_padre: null, nombre_madre: null, confianza: 'alta', campos_detectados: null,
});

describe('OcrMergeService', () => {
  let service: OcrMergeService;

  beforeEach(() => { service = new OcrMergeService(); });

  // ── normalize ──────────────────────────────────────────────────────────────

  describe('normalize', () => {
    it('lowercases the string', () => {
      expect(service.normalize('HOLA')).toBe('hola');
    });

    it('strips accents', () => {
      expect(service.normalize('Árbol')).toBe('arbol');
      expect(service.normalize('Éxito')).toBe('exito');
      expect(service.normalize('niño')).toBe('nino');
      expect(service.normalize('Ü')).toBe('u');
    });

    it('handles empty string', () => {
      expect(service.normalize('')).toBe('');
    });

    it('keeps non-accented characters intact', () => {
      expect(service.normalize('hello world 123')).toBe('hello world 123');
    });
  });

  // ── toTitleCase ────────────────────────────────────────────────────────────

  describe('toTitleCase', () => {
    it('capitalizes first letter of each word', () => {
      expect(service.toTitleCase('juan pérez')).toBe('Juan Pérez');
    });

    it('handles slash separator', () => {
      expect(service.toTitleCase('nuevo/leon')).toBe('Nuevo/Leon');
    });

    it('handles hyphen separator', () => {
      expect(service.toTitleCase('san-pedro')).toBe('San-Pedro');
    });

    it('downcases ALL-CAPS input before titling', () => {
      expect(service.toTitleCase('JUAN GARCÍA')).toBe('Juan García');
    });

    it('handles single word', () => {
      expect(service.toTitleCase('MARCO')).toBe('Marco');
    });
  });

  // ── mergeResults ───────────────────────────────────────────────────────────

  describe('mergeResults', () => {
    it('returns all-null base when given empty array', () => {
      const result = service.mergeResults([]);
      expect(result.nombre).toBeNull();
      expect(result.curp).toBeNull();
      expect(result.confianza).toBe('alta');
    });

    it('returns values from single result', () => {
      const r: OcrResult = { ...blankResult(), nombre: 'Marco', curp: 'ABCD123456HDFLRC01' };
      const merged = service.mergeResults([r]);
      expect(merged.nombre).toBe('Marco');
      expect(merged.curp).toBe('ABCD123456HDFLRC01');
    });

    it('takes first non-null value for each field', () => {
      const first: OcrResult = { ...blankResult(), nombre: 'Juan', apellido_paterno: null };
      const second: OcrResult = { ...blankResult(), nombre: 'Pedro', apellido_paterno: 'García' };
      const merged = service.mergeResults([first, second]);
      expect(merged.nombre).toBe('Juan');
      expect(merged.apellido_paterno).toBe('García');
    });

    it('fills missing fields from subsequent results', () => {
      const first: OcrResult  = { ...blankResult(), nombre: 'Ana' };
      const second: OcrResult = { ...blankResult(), curp: 'XXXX010101MDFZZZ01' };
      const merged = service.mergeResults([first, second]);
      expect(merged.nombre).toBe('Ana');
      expect(merged.curp).toBe('XXXX010101MDFZZZ01');
    });
  });

  // ── autoSelectTipoId ───────────────────────────────────────────────────────

  describe('autoSelectTipoId', () => {
    const tipos = [
      { id_tipo_documento: 1, nombre: 'INE / Credencial de Elector' },
      { id_tipo_documento: 2, nombre: 'Acta de Nacimiento' },
      { id_tipo_documento: 3, nombre: 'Comprobante de Domicilio' },
    ];
    const aliases: Record<string, string[]> = {
      'ine': ['ine', 'credencial', 'elector'],
      'acta': ['acta', 'nacimiento'],
      'comprobante': ['comprobante', 'domicilio'],
    };

    it('matches via alias', () => {
      expect(service.autoSelectTipoId('ine', tipos, aliases)).toBe(1);
    });

    it('matches via alias synonym', () => {
      expect(service.autoSelectTipoId('credencial', tipos, aliases)).toBe(1);
    });

    it('matches acta de nacimiento', () => {
      expect(service.autoSelectTipoId('acta', tipos, aliases)).toBe(2);
    });

    it('returns null when no match', () => {
      expect(service.autoSelectTipoId('pasaporte', tipos, aliases)).toBeNull();
    });

    it('returns null for empty tipos list', () => {
      expect(service.autoSelectTipoId('ine', [], aliases)).toBeNull();
    });
  });
});
