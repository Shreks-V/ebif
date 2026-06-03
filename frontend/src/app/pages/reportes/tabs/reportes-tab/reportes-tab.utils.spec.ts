import type { EChartsOption } from 'echarts';
import { AsistenciaMensualHistorico } from '../../../../shared/models/reporte.models';
import {
  donutOpt, hbarOpt, vbarOpt,
  buildAsistenciaChartOpt, formatMesLabel,
  CHART_COLORS, NAVY,
} from './reportes-tab.utils';

describe('reportes-tab.utils', () => {

  // ── formatMesLabel ─────────────────────────────────────────────────────────

  describe('formatMesLabel', () => {
    it('converts YYYY-MM to full Spanish month + year', () => {
      expect(formatMesLabel('2024-03')).toBe('Marzo 2024');
    });

    it('handles January', () => {
      expect(formatMesLabel('2025-01')).toBe('Enero 2025');
    });

    it('handles December', () => {
      expect(formatMesLabel('2023-12')).toBe('Diciembre 2023');
    });

    it('returns all 12 unique month names', () => {
      const months = Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0');
        return formatMesLabel(`2024-${m}`).split(' ')[0];
      });
      expect(new Set(months).size).toBe(12);
    });
  });

  // ── CHART_COLORS / NAVY ────────────────────────────────────────────────────

  describe('constants', () => {
    it('CHART_COLORS is an array of at least 1 color', () => {
      expect(Array.isArray(CHART_COLORS)).toBeTrue();
      expect(CHART_COLORS.length).toBeGreaterThan(0);
    });

    it('NAVY is a hex color string', () => {
      expect(NAVY).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  // ── donutOpt ───────────────────────────────────────────────────────────────

  describe('donutOpt', () => {
    let opt: EChartsOption;
    beforeEach(() => { opt = donutOpt(['A', 'B'], [10, 20]); });

    it('returns an object with series', () => {
      expect(opt.series).toBeDefined();
    });

    it('series has type pie', () => {
      const series = opt.series as { type: string }[];
      expect(series[0].type).toBe('pie');
    });

    it('data length matches labels', () => {
      const series = opt.series as { data: unknown[] }[];
      expect(series[0].data.length).toBe(2);
    });

    it('uses custom colors when provided', () => {
      const custom = ['#ff0000', '#00ff00'];
      const customOpt = donutOpt(['A', 'B'], [1, 2], custom);
      const series = customOpt.series as { data: { itemStyle: { color: string } }[] }[];
      expect(series[0].data[0].itemStyle.color).toBe('#ff0000');
    });
  });

  // ── hbarOpt ────────────────────────────────────────────────────────────────

  describe('hbarOpt', () => {
    let opt: EChartsOption;
    beforeEach(() => { opt = hbarOpt(['X', 'Y'], [5, 10]); });

    it('xAxis is type value (horizontal bar)', () => {
      const xAxis = opt.xAxis as { type: string };
      expect(xAxis.type).toBe('value');
    });

    it('yAxis has the category labels', () => {
      const yAxis = opt.yAxis as { data: string[] };
      expect(yAxis.data).toEqual(['X', 'Y']);
    });

    it('series has type bar', () => {
      const series = opt.series as { type: string }[];
      expect(series[0].type).toBe('bar');
    });

    it('uses NAVY as default color', () => {
      const series = opt.series as { itemStyle: { color: string } }[];
      expect(series[0].itemStyle.color).toBe(NAVY);
    });

    it('accepts custom color', () => {
      const custom = hbarOpt(['X'], [1], '#aabbcc');
      const series = custom.series as { itemStyle: { color: string } }[];
      expect(series[0].itemStyle.color).toBe('#aabbcc');
    });
  });

  // ── vbarOpt ────────────────────────────────────────────────────────────────

  describe('vbarOpt', () => {
    let opt: EChartsOption;
    beforeEach(() => { opt = vbarOpt(['Ene', 'Feb'], [3, 7]); });

    it('xAxis is type category (vertical bar)', () => {
      const xAxis = opt.xAxis as { type: string };
      expect(xAxis.type).toBe('category');
    });

    it('xAxis has the labels', () => {
      const xAxis = opt.xAxis as { data: string[] };
      expect(xAxis.data).toEqual(['Ene', 'Feb']);
    });

    it('series has type bar', () => {
      const series = opt.series as { type: string }[];
      expect(series[0].type).toBe('bar');
    });

    it('series data maps values correctly', () => {
      const series = opt.series as { data: { value: number }[] }[];
      expect(series[0].data[0].value).toBe(3);
      expect(series[0].data[1].value).toBe(7);
    });
  });

  // ── buildAsistenciaChartOpt ────────────────────────────────────────────────

  describe('buildAsistenciaChartOpt', () => {
    const mockData: AsistenciaMensualHistorico = {
      datos: [
        { mes: '2024-01', pacientes_unicos: 80, visitas: 95, items_entregados: 200, monto_total: 1000 },
        { mes: '2024-02', pacientes_unicos: 75, visitas: 88, items_entregados: 180, monto_total: 900 },
        { mes: '2024-03', pacientes_unicos: 90, visitas: 110, items_entregados: 230, monto_total: 1100 },
      ],
      promedio_pacientes_unicos: 81.7,
      promedio_visitas: 97.7,
      meses_incluidos: 3,
    };

    let opt: EChartsOption;
    beforeEach(() => { opt = buildAsistenciaChartOpt(mockData); });

    it('xAxis has 3 labels for 3 months', () => {
      const xAxis = opt.xAxis as { data: string[] };
      expect(xAxis.data.length).toBe(3);
    });

    it('first month label is Ene 2024', () => {
      const xAxis = opt.xAxis as { data: string[] };
      expect(xAxis.data[0]).toBe('Ene 2024');
    });

    it('last month label is Mar 2024', () => {
      const xAxis = opt.xAxis as { data: string[] };
      expect(xAxis.data[2]).toBe('Mar 2024');
    });

    it('has two series (pacientes + visitas)', () => {
      const series = opt.series as unknown[];
      expect(series.length).toBe(2);
    });

    it('first series data matches pacientes_unicos', () => {
      const series = opt.series as { data: number[] }[];
      expect(series[0].data).toEqual([80, 75, 90]);
    });

    it('second series data matches visitas', () => {
      const series = opt.series as { data: number[] }[];
      expect(series[1].data).toEqual([95, 88, 110]);
    });

    it('handles empty datos array', () => {
      const emptyOpt = buildAsistenciaChartOpt({
        datos: [], promedio_pacientes_unicos: 0, promedio_visitas: 0, meses_incluidos: 0,
      });
      const xAxis = emptyOpt.xAxis as { data: unknown[] };
      expect(xAxis.data.length).toBe(0);
    });
  });
});
