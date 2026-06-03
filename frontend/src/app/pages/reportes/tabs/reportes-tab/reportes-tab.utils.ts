import type { EChartsOption } from 'echarts';
import { AsistenciaMensualHistorico } from '../../../../shared/models/reporte.models';

export const CHART_COLORS = ['#3b82f6','#ec4899','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f87171','#34d399'];
export const NAVY = '#00328b';

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function donutOpt(labels: string[], values: number[], colors?: string[]): EChartsOption {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['45%', '68%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: labels.map((name, i) => ({
        name,
        value: values[i] ?? 0,
        itemStyle: { color: (colors ?? CHART_COLORS)[i % CHART_COLORS.length] },
      })),
    }],
  };
}

export function hbarOpt(labels: string[], values: number[], color = NAVY): EChartsOption {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '6%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    yAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, width: 140, overflow: 'truncate' } },
    series: [{ type: 'bar', data: values, itemStyle: { color, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 28 }],
  };
}

export function vbarOpt(labels: string[], values: number[], colors?: string[]): EChartsOption {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar',
      data: values.map((v, i) => ({
        value: v,
        itemStyle: { color: (colors ?? CHART_COLORS)[i % CHART_COLORS.length], borderRadius: [4, 4, 0, 0] },
      })),
      barMaxWidth: 48,
    }],
  };
}

export function buildAsistenciaChartOpt(data: AsistenciaMensualHistorico): EChartsOption {
  const meses = data.datos.map(d => {
    const [anio, mes] = d.mes.split('-');
    return `${MESES_CORTOS[Number.parseInt(mes, 10) - 1]} ${anio}`;
  });
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Pacientes únicos', 'Visitas (tickets)'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: { type: 'category', data: meses, axisLabel: { fontSize: 10, rotate: 30 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: 'Pacientes únicos',
        type: 'bar',
        data: data.datos.map(d => d.pacientes_unicos),
        itemStyle: { color: '#00328b', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24,
      },
      {
        name: 'Visitas (tickets)',
        type: 'bar',
        data: data.datos.map(d => d.visitas),
        itemStyle: { color: '#60a5fa', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24,
      },
    ],
  };
}

export function formatMesLabel(mesStr: string): string {
  const [anio, mes] = mesStr.split('-');
  return `${MESES_LARGOS[Number.parseInt(mes, 10) - 1]} ${anio}`;
}
