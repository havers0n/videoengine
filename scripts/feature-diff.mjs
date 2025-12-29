import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Читаем CSV файл, так как там есть все boolean-поля и ENGINE_CLASS
// В master/features.json есть только feature_events, но нет развернутых boolean-полей
// и ENGINE_CLASS, поэтому используем CSV для анализа
const csvPath = path.join(rootDir, "master", "features.csv");
const csvContent = fs.readFileSync(csvPath, "utf8");
const lines = csvContent.split("\n").filter((line) => line.trim());

if (lines.length < 2) {
  console.error("CSV файл пуст или содержит только заголовки");
  process.exit(1);
}

// Парсим заголовки
const headers = lines[0].split(",");
const engineClassIdx = headers.indexOf("ENGINE_CLASS");

if (engineClassIdx === -1) {
  console.error("Колонка ENGINE_CLASS не найдена в CSV");
  process.exit(1);
}

// Находим все boolean-колонки (начинаются с has_, pass_, force_, uses_, и т.д.)
const boolKeys = headers.filter((h) => {
  const key = h.trim();
  return (
    typeof key === "string" &&
    (key.startsWith("has_") ||
      key.startsWith("pass_") ||
      key.startsWith("force_") ||
      key.startsWith("uses_") ||
      key === "no_react_state_in_loop" ||
      key === "setState_in_raf")
  );
});

// Добавляем вычисляемые поля, которые будут добавлены позже
const computedBoolKeys = ["has_tracks", "has_accumulator_loop"];

console.log(`Найдено ${boolKeys.length} boolean-фич из CSV`);

// Парсим данные
const data = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Простой парсинг CSV (учитываем, что feature_events может содержать запятые в JSON)
  const parts = [];
  let current = "";
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "," && !inQuotes) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);

  if (parts.length < headers.length) continue;

  const row = {};
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j].trim();
    let value = parts[j] || "";

    // Убираем кавычки
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"');
    }

    // Преобразуем в boolean для boolean-колонок
    if (boolKeys.includes(key)) {
      row[key] = value === "1" || value === "true" || value === true;
    } else if (key === "ENGINE_CLASS") {
      row[key] = value;
    } else {
      row[key] = value;
    }
  }

  if (row.ENGINE_CLASS) {
    // Вычисляем дополнительные поля на основе feature_events и существующих данных
    
    // has_tracks: явный детектор Track-класса / keyframes / sample(t)
    // Комбинируем все существующие поля tracks-related
    const hasTracksSystem = Boolean(row.has_tracks_system);
    const hasKeyframeSystem = Boolean(row.has_keyframe_system);
    const hasTimelineFile = Boolean(row.has_timeline_file);
    const hasTrackSequencing = Boolean(row.has_track_sequencing);
    
    // Базовое вычисление: если есть любое из tracks-related полей
    let hasTracks = hasTracksSystem || hasKeyframeSystem || hasTimelineFile || hasTrackSequencing;
    
    // Дополнительная детекция из feature_events (если они доступны как строка)
    const featureEventsStr = String(row.feature_events || "");
    if (featureEventsStr.length > 10) { // Минимальная длина для проверки
      const tracksPatterns = [
        /\bTrack\s*[=:\(]/i,                    // Track класс
        /\bkeyframes?\s*[:\{]/i,               // keyframes
        /\.sample\s*\(/i,                       // sample(t)
        /\banimateTrack\b/i,                    // animateTrack
        /\btracks?\s*\.\s*(push|map|forEach)/i, // tracks.push/map
        /\btrack\s*[=:]\s*\{/i,                 // track = { ... }
      ];
      
      for (const pattern of tracksPatterns) {
        if (pattern.test(featureEventsStr)) {
          hasTracks = true;
          break;
        }
      }
    }
    
    row.has_tracks = hasTracks;
    
    // has_accumulator_loop: while accumulator >= fixedDt
    // Если есть has_fixed_timestep, то почти наверняка есть accumulator loop
    const hasFixedTimestep = Boolean(row.has_fixed_timestep);
    
    // Детекция паттерна accumulator loop из feature_events
    const accumulatorPatterns = [
      /\bwhile\s*\([^)]*accumulator\s*>=\s*(fixedDt|FIXED_DT|fixedTimeStep)/i,
      /\bwhile\s*\([^)]*acc\s*>=\s*(fixedDt|FIXED_DT|fixedTimeStep)/i,
      /\baccumulator\s*\+=\s*[^;]+while\s*\([^)]*>=/i,
      /\bacc\s*\+=\s*[^;]+while\s*\([^)]*>=/i,
      /\bwhile\s*\([^)]*accumulator\s*>=/i,     // более общий паттерн
      /\bwhile\s*\([^)]*acc\s*>=/i,            // более общий паттерн
    ];
    
    let hasAccumulatorLoop = hasFixedTimestep; // Если есть fixed timestep, вероятно есть accumulator loop
    
    // Дополнительная проверка из feature_events
    if (featureEventsStr.length > 10) {
      for (const pattern of accumulatorPatterns) {
        if (pattern.test(featureEventsStr)) {
          hasAccumulatorLoop = true;
          break;
        }
      }
    }
    
    row.has_accumulator_loop = hasAccumulatorLoop;
    
    data.push(row);
  }
}


// Какие классы сравниваем
const CLASSES = ["STABLE", "NON_COMPLIANT", "NON_DETERMINISTIC"];

function groupByClass(rows) {
  const map = new Map();
  for (const c of CLASSES) map.set(c, []);
  for (const r of rows) {
    const c = r.ENGINE_CLASS;
    if (map.has(c)) map.get(c).push(r);
  }
  return map;
}

function rate(rows, key) {
  if (!rows.length) return 0;
  let cnt = 0;
  for (const r of rows) if (r[key]) cnt++;
  return cnt / rows.length;
}

const byClass = groupByClass(data);

const stable = byClass.get("STABLE");
const nonCompliant = byClass.get("NON_COMPLIANT");
const nonDeterministic = byClass.get("NON_DETERMINISTIC");
const other = data.filter((r) => r.ENGINE_CLASS !== "STABLE");

console.log(`STABLE: ${stable.length}`);
console.log(`NON_COMPLIANT: ${nonCompliant.length}`);
console.log(`NON_DETERMINISTIC: ${nonDeterministic.length}`);
console.log(`OTHER (не STABLE): ${other.length}`);

// Объединяем все boolean-фичи (из CSV + вычисляемые)
const allBoolKeys = [...boolKeys, ...computedBoolKeys];

// Для каждой boolean-фичи считаем вероятности и lift
const rows = allBoolKeys.map((k) => {
  const pStable = rate(stable, k);
  const pNonCompliant = rate(nonCompliant, k);
  const pNonDeterministic = rate(nonDeterministic, k);
  const pOther = rate(other, k);

  // lift = p(feature|STABLE) / p(feature|OTHER)
  const lift = pOther === 0 ? (pStable > 0 ? 999 : 1) : pStable / pOther;

  // coverage — сколько раз фича встречается вообще (чтобы не ловить шум)
  const totalTrue = data.reduce((acc, r) => acc + (r[k] ? 1 : 0), 0);

  return {
    feature: k,
    p_stable: +pStable.toFixed(3),
    p_non_compliant: +pNonCompliant.toFixed(3),
    p_non_deterministic: +pNonDeterministic.toFixed(3),
    p_other: +pOther.toFixed(3),
    lift: +lift.toFixed(2),
    total_true: totalTrue,
    coverage: +((totalTrue / data.length) * 100).toFixed(1), // процент покрытия
  };
});

// Фильтр от шума: фича должна встречаться хотя бы 3 раза
// Исключение: has_tracks и has_accumulator_loop всегда включаются (важные для анализа)
const filtered = rows
  .filter((r) => r.total_true >= 3 || computedBoolKeys.includes(r.feature))
  .sort((a, b) => {
    // Сортируем сначала по lift (убывание), потом по coverage (убывание)
    if (Math.abs(b.lift - a.lift) > 0.01) {
      return b.lift - a.lift;
    }
    return b.coverage - a.coverage;
  });

// Формируем результат (компактный формат ~200-500 строк)
const result = {
  meta: {
    total: data.length,
    stable: stable.length,
    non_compliant: nonCompliant.length,
    non_deterministic: nonDeterministic.length,
    other: other.length,
    bool_features: boolKeys.length,
    computed_features: computedBoolKeys.length,
    total_features: allBoolKeys.length,
    filtered_features: filtered.length,
  },
  // Топ-25 фич с высоким lift (характерны для STABLE)
  top: filtered.slice(0, 25),
  // Топ-25 фич с низким lift (не характерны для STABLE)
  bottom: filtered.slice(-25),
};

const outputPath = path.join(rootDir, "master", "feature_diff_stable_vs_other.json");
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log(`\n✅ Сохранено в ${outputPath}`);
console.log(`\n📊 Статистика:`);
console.log(`   Всего фич: ${result.meta.bool_features}`);
console.log(`   После фильтрации (coverage >= 3): ${result.meta.filtered_features}`);
console.log(`\n🔝 Топ-5 фич с высоким lift для STABLE:`);
result.top.slice(0, 5).forEach((f, i) => {
  console.log(
    `   ${i + 1}. ${f.feature}: lift=${f.lift}, p_stable=${f.p_stable}, p_other=${f.p_other}, coverage=${f.coverage}%`
  );
});

