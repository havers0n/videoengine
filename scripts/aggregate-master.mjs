import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const runs = ['legacy_01', 'legacy_02', 'legacy_03', 'legacy_04'];

// Шаг 1: Объединить все variants_features.json в master/features.jsonl
console.log('📦 Агрегация JSON файлов...');
const allJsonRecords = [];

for (const runId of runs) {
  const jsonPath = path.join(rootDir, 'runs', runId, 'reports', 'variants_features.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️  Файл не найден: ${jsonPath}`);
    continue;
  }

  console.log(`  📄 Обработка ${runId}...`);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  // data - это массив объектов с полями variant и feature_events
  for (const record of data) {
    allJsonRecords.push({
      run_id: runId,
      variant: record.variant,
      feature_events: record.feature_events,
    });
  }
}

// Сохраняем как JSONL (каждая строка - отдельный JSON объект)
const jsonlPath = path.join(rootDir, 'master', 'features.jsonl');
const jsonlContent = allJsonRecords.map(r => JSON.stringify(r)).join('\n');
fs.writeFileSync(jsonlPath, jsonlContent, 'utf-8');
console.log(`✅ Сохранено ${allJsonRecords.length} записей в ${jsonlPath}`);

// Также сохраняем как JSON массив для удобства
const jsonPath = path.join(rootDir, 'master', 'features.json');
fs.writeFileSync(jsonPath, JSON.stringify(allJsonRecords, null, 2), 'utf-8');
console.log(`✅ Сохранено ${allJsonRecords.length} записей в ${jsonPath}`);

// Шаг 2: Объединить все CSV в master/features.csv
console.log('\n📊 Агрегация CSV файлов...');
const allCsvRows = [];
let csvHeaders = null;

for (const runId of runs) {
  const csvPath = path.join(rootDir, 'runs', runId, 'reports', 'variants_features.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️  Файл не найден: ${csvPath}`);
    continue;
  }

  console.log(`  📄 Обработка ${runId}...`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) continue;
  
  // Первая строка - заголовки
  if (!csvHeaders) {
    // Добавляем run_id в начало заголовков
    const originalHeaders = lines[0].split(',');
    csvHeaders = ['run_id', ...originalHeaders];
  }
  
  // Остальные строки - данные
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Парсим CSV строку (учитывая, что feature_events может содержать запятые в JSON)
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current); // Последняя часть
    
    // Добавляем run_id в начало
    allCsvRows.push([runId, ...parts]);
  }
}

// Сохраняем объединенный CSV
const masterCsvPath = path.join(rootDir, 'master', 'features.csv');
const csvContent = [
  csvHeaders.join(','),
  ...allCsvRows.map(row => row.map(cell => {
    // Экранируем запятые и кавычки в ячейках
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }).join(','))
].join('\n');

fs.writeFileSync(masterCsvPath, csvContent, 'utf-8');
console.log(`✅ Сохранено ${allCsvRows.length} строк в ${masterCsvPath}`);

// Статистика
console.log('\n📈 Статистика:');
console.log(`  Всего вариантов: ${allJsonRecords.length}`);
console.log(`  Run ID распределение:`);
const runCounts = {};
for (const record of allJsonRecords) {
  runCounts[record.run_id] = (runCounts[record.run_id] || 0) + 1;
}
for (const [runId, count] of Object.entries(runCounts)) {
  console.log(`    ${runId}: ${count} вариантов`);
}

console.log('\n✅ Агрегация завершена!');

