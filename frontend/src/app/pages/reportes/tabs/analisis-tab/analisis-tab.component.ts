import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { MetricasApiService, MetricasDashboard } from '../../../../services/metricas-api.service';

@Component({
  selector: 'app-analisis-tab',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './analisis-tab.component.html',
})
export class AnalisisTabComponent implements OnInit {
  metricas: MetricasDashboard | null = null;
  loading = true;

  geoChartOpt: EChartsOption = {};
  tendenciaSemanaltOpt: EChartsOption = {};
  tendenciaMensualOpt: EChartsOption = {};
  generoChartOpt: EChartsOption = {};
  espinaChartOpt: EChartsOption = {};
  cuotasChartOpt: EChartsOption = {};
  estadosChartOpt: EChartsOption = {};

  private readonly destroyRef = inject(DestroyRef);
  private readonly metricasApi = inject(MetricasApiService);

  ngOnInit(): void {
    this.metricasApi.getMetricas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (m) => {
          this.metricas = m;
          this.loading = false;
          this._buildCharts(m);
        },
        error: () => { this.loading = false; },
      });
  }

  private _buildCharts(m: MetricasDashboard): void {
    // ── Concentración geográfica (municipios) ────────────────────
    const geo = m.concentracion_geografica ?? [];
    this.geoChartOpt = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '2%', right: '10%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
      yAxis: { type: 'category', data: geo.map(g => g.municipio).reverse(), axisLabel: { fontSize: 11, width: 130, overflow: 'truncate' } },
      series: [{ type: 'bar', data: geo.map(g => g.total).reverse(), itemStyle: { color: '#0052cc', borderRadius: [0, 4, 4, 0] }, barMaxWidth: 22, label: { show: true, position: 'right', fontSize: 10 } }],
    };

    // ── Top estados ───────────────────────────────────────────────
    const est = m.top_estados ?? [];
    this.estadosChartOpt = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '2%', right: '10%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
      yAxis: { type: 'category', data: est.map(e => e.estado).reverse(), axisLabel: { fontSize: 10, width: 140, overflow: 'truncate' } },
      series: [{ type: 'bar', data: est.map(e => e.total).reverse(), itemStyle: { color: '#7c3aed', borderRadius: [0, 4, 4, 0] }, barMaxWidth: 22, label: { show: true, position: 'right', fontSize: 10 } }],
    };

    // ── Tendencia semanal ─────────────────────────────────────────
    const sem = m.tendencia_semanal ?? [];
    this.tendenciaSemanaltOpt = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '3%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: sem.map(s => s.etiqueta), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11 }, minInterval: 1 },
      series: [{
        type: 'bar', barMaxWidth: 38,
        data: sem.map((s, i) => ({ value: s.nuevos, itemStyle: { color: i === sem.length - 1 ? '#f3ad1c' : '#00328b', borderRadius: [4, 4, 0, 0] } })),
      }],
    };

    // ── Tendencia mensual (línea con área) ────────────────────────
    const men = m.tendencia_mensual ?? [];
    this.tendenciaMensualOpt = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '3%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: men.map(s => s.mes), axisLabel: { fontSize: 10, rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11 }, minInterval: 1 },
      series: [{
        type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
        lineStyle: { color: '#10b981', width: 3 },
        itemStyle: { color: '#10b981' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.3)' }, { offset: 1, color: 'rgba(16,185,129,0.02)' }] } },
        data: men.map(s => s.nuevos),
        label: { show: true, fontSize: 10, position: 'top' },
      }],
    };

    // ── Distribución por género (donut) ───────────────────────────
    const gen = m.distribucion_genero ?? [];
    const GENERO_COLORS: Record<string, string> = { 'Masculino': '#0052cc', 'Femenino': '#f472b6', 'No especificado': '#94a3b8' };
    this.generoChartOpt = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['45%', '72%'], center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
        data: gen.filter(g => g.total > 0).map(g => ({ name: g.label, value: g.total, itemStyle: { color: GENERO_COLORS[g.label] ?? '#cbd5e1' } })),
      }],
    };

    // ── Tipos de espina bífida (barras horizontales) ──────────────
    const esp = m.tipos_espina_prevalencia ?? [];
    this.espinaChartOpt = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: unknown) => {
        const params = p as { name: string; value: number }[];
        const d = params[0];
        const pct = esp.find(e => e.nombre === d.name)?.pct ?? 0;
        return `${d.name}: <b>${d.value}</b> (${pct}%)`;
      }},
      grid: { left: '2%', right: '12%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
      yAxis: { type: 'category', data: esp.map(e => e.nombre).reverse(), axisLabel: { fontSize: 11, width: 150, overflow: 'truncate' } },
      series: [{
        type: 'bar', barMaxWidth: 22,
        data: esp.map((e, i) => ({ value: e.total, itemStyle: { color: ['#00328b','#0052cc','#3b82f6','#60a5fa','#93c5fd'][i % 5], borderRadius: [0, 4, 4, 0] } })).reverse(),
        label: { show: true, position: 'right', fontSize: 10 },
      }],
    };

    // ── Distribución por tipo de cuota (barras verticales) ───────
    const cuotas = m.distribucion_cuotas ?? [];
    this.cuotasChartOpt = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '3%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: cuotas.map(c => c.tipo_cuota), axisLabel: { fontSize: 11, rotate: cuotas.length > 4 ? 20 : 0 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11 }, minInterval: 1 },
      series: [{
        type: 'bar', barMaxWidth: 48,
        data: cuotas.map((c, i) => ({ value: c.total, itemStyle: { color: ['#f3ad1c','#10b981','#0052cc','#f97316','#8b5cf6'][i % 5], borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', fontSize: 11, fontWeight: 'bold' },
      }],
    };
  }
}
