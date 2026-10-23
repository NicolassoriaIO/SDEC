import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { dataForExport } from '../database/repositories/statsRepo';
import { formatDateEs, todayKey } from '../utils/date';
import { formatNumber } from '../utils/numbers';

function safeDate() {
  return todayKey();
}

export async function exportPersonalData(userId) {
  const data = await dataForExport(userId);
  const payload = {
    aplicacion: 'SDEC — Seguimiento de Ejercicio y Comida',
    version: '1.0.0',
    exportado_en: new Date().toISOString(),
    datos: data,
  };
  const uri = `${FileSystem.cacheDirectory}sdec-datos-${safeDate()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar datos de SDEC',
    });
  }
  return uri;
}

export async function exportWeightCsv(userId) {
  const data = await dataForExport(userId);
  const rows = data.tablas.weight_logs || [];
  const csv = [
    'fecha,peso_kg,cintura_cm,notas',
    ...rows.map((row) => [row.date, row.weight_kg, row.waist_cm ?? '', String(row.notes || '').replace(/,/g, ';')].join(',')),
  ].join('\n');
  const uri = `${FileSystem.cacheDirectory}sdec-peso-${safeDate()}.csv`;
  await FileSystem.writeAsStringAsync(uri, `\uFEFF${csv}`, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Exportar historial de peso' });
  }
  return uri;
}

export async function exportProgressPdf(userId, { profile, dashboard }) {
  const html = `
    <html><head><meta charset="utf-8" /><style>
      body { font-family: Helvetica, Arial, sans-serif; color: #172014; padding: 28px; }
      h1 { color: #4d7500; margin-bottom: 4px; }
      h2 { color: #25301f; margin-top: 24px; border-bottom: 1px solid #dce5d4; padding-bottom: 4px; }
      .muted { color: #66705f; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td, th { border-bottom: 1px solid #e6ece0; padding: 7px; text-align: left; font-size: 13px; }
      .box { background: #f4f8ee; border-radius: 8px; padding: 14px; margin-top: 10px; }
      .big { font-size: 26px; font-weight: bold; color: #4d7500; }
    </style></head><body>
      <h1>SDEC</h1>
      <div class="muted">Seguimiento de Ejercicio y Comida · Resumen generado el ${formatDateEs(todayKey(), { year: 'numeric' })}</div>
      <h2>Perfil</h2>
      <div class="box">
        <p><strong>${profile?.display_name || 'Usuario'}</strong> · ${profile?.email || ''}</p>
        <p>Objetivo: ${profile?.goal || 'No definido'} · Estatura: ${profile?.height_cm || '—'} cm</p>
      </div>
      <h2>Resumen de hoy</h2>
      <table>
        <tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Calorías consumidas</td><td>${formatNumber(dashboard?.totals?.calories || 0)} kcal</td></tr>
        <tr><td>Proteínas</td><td>${formatNumber(dashboard?.totals?.protein || 0, 1)} g</td></tr>
        <tr><td>Pasos</td><td>${formatNumber(dashboard?.steps?.steps || 0)}</td></tr>
        <tr><td>Agua</td><td>${formatNumber(dashboard?.water || 0)} ml</td></tr>
        <tr><td>Peso más reciente</td><td>${dashboard?.weight ? `${formatNumber(dashboard.weight.weight_kg, 1)} kg` : 'Sin registro'}</td></tr>
        <tr><td>Entrenamientos esta semana</td><td>${dashboard?.workout?.weekCount || 0}</td></tr>
      </table>
      <h2>Aviso</h2>
      <p class="muted">Este resumen es informativo. Las estimaciones nutricionales y energéticas son aproximadas y no sustituyen la valoración de un profesional sanitario o nutricionista.</p>
    </body></html>
  `;
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar resumen SDEC' });
  }
  return uri;
}
