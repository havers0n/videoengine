import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "csv-stringify/sync";

// Определяем путь к файлу данных относительно расположения скрипта
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataFile = path.join(__dirname, "variants_features.json");

// Список известных команд
const KNOWN_COMMANDS = [
  "stats",
  "top",
  "filter",
  "search",
  "signatures",
  "export",
  "compare",
  "novelty",
  "diff",
  "help",
];

// Определяем файл и команду
// Если второй аргумент - известная команда, то это команда, иначе - файл
let INPUT_FILE, COMMAND, ARG_OFFSET;
if (process.argv[2] && KNOWN_COMMANDS.includes(process.argv[2])) {
  // Второй аргумент - команда, файл не указан
  // Пытаемся найти файл: сначала в директории скрипта, потом в корне проекта
  const rootDataFile = path.join(__dirname, "..", "..", "variants_features.json");
  
  // Проверяем, какой файл существует и не пустой
  let selectedFile = null;
  if (fs.existsSync(defaultDataFile)) {
    try {
      const content = fs.readFileSync(defaultDataFile, "utf8");
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        selectedFile = defaultDataFile;
      }
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }
  
  if (!selectedFile && fs.existsSync(rootDataFile)) {
    try {
      const content = fs.readFileSync(rootDataFile, "utf8");
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        selectedFile = rootDataFile;
      }
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }
  
  INPUT_FILE = selectedFile || defaultDataFile; // Используем найденный файл или по умолчанию
  COMMAND = process.argv[2];
  ARG_OFFSET = 3; // Аргументы команд начинаются с индекса 3
} else {
  // Второй аргумент - файл (или undefined), третий - команда
  INPUT_FILE = process.argv[2] ?? defaultDataFile;
  COMMAND = process.argv[3] ?? "stats";
  ARG_OFFSET = 4; // Аргументы команд начинаются с индекса 4
}

/**
 * Универсальный обработчик variants_features.json
 * 
 * Команды:
 *   stats          - общая статистика по всем вариантам
 *   top            - топ вариантов по score
 *   filter         - фильтрация по критериям
 *   search         - поиск вариантов с определенными фичами
 *   signatures     - группировка по сигнатурам
 *   export         - экспорт в CSV/JSON
 *   compare        - сравнение вариантов
 *   novelty        - топ вариантов по novelty (уникальности фич)
 *   diff           - сравнение фич двух вариантов (Missing/Present)
 */

function loadData() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Файл не найден: ${INPUT_FILE}`);
  }
  const content = fs.readFileSync(INPUT_FILE, "utf8");
  const data = JSON.parse(content);
  
  // Проверяем, что данные не пустые
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Файл ${INPUT_FILE} пуст или не содержит данных. Укажите файл явно или убедитесь, что файл содержит данные.`);
  }
  
  return data;
}

function printStats(data) {
  console.log("\n=== ОБЩАЯ СТАТИСТИКА ===\n");
  console.log(`Всего вариантов: ${data.length}`);

  // Статистика по boolean фичам
  const boolFeatures = Object.keys(data[0]).filter(
    (k) =>
      typeof data[0][k] === "boolean" &&
      (k.startsWith("has_") ||
        k.startsWith("force_") ||
        k.startsWith("pass_") ||
        k.startsWith("uses_") ||
        k === "setState_in_raf")
  );

  console.log("\n--- Распределение фич ---");
  const featureStats = boolFeatures.map((key) => {
    const count = data.filter((r) => r[key] === true).length;
    const pct = ((count / data.length) * 100).toFixed(1);
    return { key, count, pct };
  });

  featureStats
    .sort((a, b) => b.count - a.count)
    .forEach((f) => {
      console.log(`${f.key.padEnd(35)} ${String(f.count).padStart(4)} (${f.pct}%)`);
    });

  // Статистика по ENGINE_CLASS
  console.log("\n--- Классы движков ---");
  const engineStats = {};
  data.forEach((r) => {
    engineStats[r.ENGINE_CLASS] = (engineStats[r.ENGINE_CLASS] || 0) + 1;
  });
  Object.entries(engineStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cls, count]) => {
      const pct = ((count / data.length) * 100).toFixed(1);
      console.log(`${cls.padEnd(20)} ${String(count).padStart(4)} (${pct}%)`);
    });

  // Статистика по score
  const scores = data.map((r) => r.score).filter((s) => s != null);
  if (scores.length > 0) {
    scores.sort((a, b) => a - b);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const min = scores[0];
    const max = scores[scores.length - 1];
    const median = scores[Math.floor(scores.length / 2)];
    console.log("\n--- Score статистика ---");
    console.log(`Средний: ${avg}`);
    console.log(`Мин: ${min}, Макс: ${max}, Медиана: ${median}`);
  }

  // Анти-паттерны
  const badPatterns = data.filter((r) => r.setState_in_raf);
  if (badPatterns.length > 0) {
    console.log(`\n⚠️  Варианты с setState_in_raf: ${badPatterns.length}`);
    console.log(badPatterns.map((r) => r.variant).join(", "));
  }
}

function printTop(data, limit = 10) {
  console.log(`\n=== ТОП-${limit} ВАРИАНТОВ ПО SCORE ===\n`);
  const sorted = [...data]
    .filter((r) => r.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  sorted.forEach((r, idx) => {
    console.log(
      `${String(idx + 1).padStart(2)}. ${r.variant.padEnd(45)} score: ${String(r.score).padStart(3)} [${r.ENGINE_CLASS}] ${r.signature}`
    );
  });
}

function filterVariants(data, criteria) {
  // criteria: объект с условиями фильтрации
  // Пример: { has_threads: true, score: { min: 15 }, ENGINE_CLASS: "STABLE" }
  return data.filter((variant) => {
    for (const [key, value] of Object.entries(criteria)) {
      if (value === null || value === undefined) continue;

      if (typeof value === "object" && value.min !== undefined) {
        if (variant[key] < value.min) return false;
      } else if (typeof value === "object" && value.max !== undefined) {
        if (variant[key] > value.max) return false;
      } else if (Array.isArray(value)) {
        if (!value.includes(variant[key])) return false;
      } else {
        if (variant[key] !== value) return false;
      }
    }
    return true;
  });
}

function printFiltered(data, criteriaStr) {
  let criteria = {};
  try {
    // Парсим JSON из строки или используем как есть
    if (criteriaStr.startsWith("{")) {
      criteria = JSON.parse(criteriaStr);
    } else {
      // Простой формат: key=value,key2=value2
      criteriaStr.split(",").forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          if (value === "true") criteria[key] = true;
          else if (value === "false") criteria[key] = false;
          else if (!isNaN(value)) criteria[key] = Number(value);
          else criteria[key] = value;
        }
      });
    }
  } catch (e) {
    console.error(`Ошибка парсинга критериев: ${e.message}`);
    return;
  }

  const filtered = filterVariants(data, criteria);
  console.log(`\n=== РЕЗУЛЬТАТЫ ФИЛЬТРАЦИИ ===\n`);
  console.log(`Найдено: ${filtered.length} из ${data.length}`);
  console.log(`Критерии: ${JSON.stringify(criteria, null, 2)}`);

  if (filtered.length > 0) {
    console.log("\nВарианты:");
    filtered.forEach((r) => {
      console.log(`  - ${r.variant} (score: ${r.score}, ${r.ENGINE_CLASS})`);
    });
  }
}

function searchByFeatures(data, featuresStr) {
  // featuresStr: "has_threads,has_clusters,has_hotspots"
  const features = featuresStr.split(",").map((f) => f.trim());
  const results = data.filter((variant) => {
    return features.every((f) => variant[f] === true);
  });

  console.log(`\n=== ПОИСК ПО ФИЧАМ ===\n`);
  console.log(`Искомые фичи: ${features.join(", ")}`);
  console.log(`Найдено: ${results.length} из ${data.length}`);

  if (results.length > 0) {
    results
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .forEach((r) => {
        console.log(`  ✓ ${r.variant.padEnd(45)} score: ${String(r.score || 0).padStart(3)} [${r.signature}]`);
      });
  }
}

function printSignatures(data) {
  console.log(`\n=== ГРУППИРОВКА ПО СИГНАТУРАМ ===\n`);
  const sigGroups = {};

  data.forEach((r) => {
    const sig = r.signature || "UNKNOWN";
    if (!sigGroups[sig]) {
      sigGroups[sig] = [];
    }
    sigGroups[sig].push(r);
  });

  const sorted = Object.entries(sigGroups)
    .map(([sig, variants]) => ({
      sig,
      count: variants.length,
      avgScore: (variants.reduce((sum, v) => sum + (v.score || 0), 0) / variants.length).toFixed(1),
      variants,
    }))
    .sort((a, b) => b.count - a.count);

  sorted.forEach((group) => {
    console.log(`\n${group.sig} (${group.count} вариантов, avg score: ${group.avgScore})`);
    group.variants
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .forEach((v) => {
        console.log(`  - ${v.variant} (score: ${v.score || 0})`);
      });
    if (group.variants.length > 5) {
      console.log(`  ... и еще ${group.variants.length - 5}`);
    }
  });
}

function exportData(data, format, outputFile) {
  if (format === "csv") {
    const csv = stringify(data, { header: true });
    fs.writeFileSync(outputFile, csv, "utf8");
    console.log(`\n✓ Экспортировано в CSV: ${outputFile}`);
  } else if (format === "json") {
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf8");
    console.log(`\n✓ Экспортировано в JSON: ${outputFile}`);
  } else {
    console.error(`Неизвестный формат: ${format}`);
  }
}

function compareVariants(data, variantNames) {
  const variants = data.filter((r) => variantNames.includes(r.variant));
  if (variants.length === 0) {
    console.log("Варианты не найдены");
    return;
  }

  console.log(`\n=== СРАВНЕНИЕ ВАРИАНТОВ ===\n`);
  const allKeys = new Set();
  variants.forEach((v) => {
    Object.keys(v).forEach((k) => allKeys.add(k));
  });

  const relevantKeys = Array.from(allKeys).filter(
    (k) =>
      !k.startsWith("feature_events") &&
      k !== "variant" &&
      (typeof variants[0][k] === "boolean" || typeof variants[0][k] === "number" || typeof variants[0][k] === "string")
  );

  console.log("Фича".padEnd(35), variantNames.map((n) => n.padEnd(30)).join(""));
  console.log("-".repeat(35 + variantNames.length * 30));

  relevantKeys.forEach((key) => {
    const values = variants.map((v) => {
      const val = v[key];
      if (typeof val === "boolean") return val ? "✓" : "✗";
      if (val === null || val === undefined) return "-";
      return String(val);
    });
    console.log(key.padEnd(35), values.map((v) => v.padEnd(30)).join(""));
  });
}

/**
 * Режим Novelty: считает редкость фич и редкость сигнатуры
 * noveltyScore(variant) = sum(rarity(feature==true)) + bonus(if signature count == 1)
 */
function printNovelty(data, limit = 20) {
  console.log(`\n=== NOVELTY RANK (Топ-${limit} по уникальности) ===\n`);

  // Получаем все boolean фичи
  const boolFeatures = Object.keys(data[0]).filter(
    (k) =>
      typeof data[0][k] === "boolean" &&
      (k.startsWith("has_") ||
        k.startsWith("force_") ||
        k.startsWith("pass_") ||
        k.startsWith("uses_") ||
        k === "setState_in_raf")
  );

  const totalVariants = data.length;

  // Считаем частоту каждой фичи
  const featureFreq = {};
  boolFeatures.forEach((key) => {
    const count = data.filter((r) => r[key] === true).length;
    featureFreq[key] = count;
  });

  // Считаем редкость: rarity = 1 / freq
  const featureRarity = {};
  boolFeatures.forEach((key) => {
    const freq = featureFreq[key];
    // Избегаем деления на ноль, если фича нигде не встречается
    featureRarity[key] = freq > 0 ? totalVariants / freq : totalVariants;
  });

  // Считаем частоту сигнатур для бонуса уникальности
  const signatureCounts = {};
  data.forEach((r) => {
    const sig = r.signature || "UNKNOWN";
    signatureCounts[sig] = (signatureCounts[sig] || 0) + 1;
  });

  // Считаем novelty score для каждого варианта
  const variantsWithNovelty = data.map((variant) => {
    let noveltyScore = 0;

    // Суммируем редкость всех true фич
    boolFeatures.forEach((key) => {
      if (variant[key] === true) {
        noveltyScore += featureRarity[key];
      }
    });

    // Бонус за уникальную сигнатуру
    const sig = variant.signature || "UNKNOWN";
    if (signatureCounts[sig] === 1) {
      noveltyScore += totalVariants * 0.5; // Бонус = 50% от общего количества вариантов
    }

    return {
      ...variant,
      noveltyScore,
    };
  });

  // Сортируем по novelty score и выводим топ
  const sorted = variantsWithNovelty
    .sort((a, b) => b.noveltyScore - a.noveltyScore)
    .slice(0, limit);

  console.log("Ранг".padStart(4), "Вариант".padEnd(45), "Novelty".padStart(10), "Score".padStart(6), "Signature".padEnd(20), "Уникальная сигнатура");
  console.log("-".repeat(120));

  sorted.forEach((r, idx) => {
    const sig = r.signature || "UNKNOWN";
    const isUniqueSig = signatureCounts[sig] === 1 ? "⭐" : "";
    console.log(
      String(idx + 1).padStart(4),
      r.variant.padEnd(45),
      r.noveltyScore.toFixed(2).padStart(10),
      String(r.score || 0).padStart(6),
      sig.padEnd(20),
      isUniqueSig
    );
  });

  console.log(`\nВсего вариантов: ${totalVariants}`);
  console.log(`Уникальных сигнатур: ${Object.values(signatureCounts).filter((c) => c === 1).length}`);
}

/**
 * Режим Diff: сравнивает вариант с champion и показывает различия в фичах
 * Формат: diff variant1 variant2 (где variant2 - champion)
 * Вывод: 
 *   Missing - фичи, которые есть в champion, но отсутствуют в variant1
 *   Present - фичи, которые есть в variant1, но отсутствуют в champion
 */
function printDiff(data, variant1Name, variant2Name) {
  console.log(`\n=== DIFF: ${variant1Name} vs ${variant2Name} ===\n`);

  const variant1 = data.find((r) => r.variant === variant1Name);
  const variant2 = data.find((r) => r.variant === variant2Name);

  if (!variant1) {
    console.error(`❌ Вариант не найден: ${variant1Name}`);
    return;
  }
  if (!variant2) {
    console.error(`❌ Вариант не найден: ${variant2Name}`);
    return;
  }

  // Получаем все boolean фичи
  const boolFeatures = Object.keys(data[0]).filter(
    (k) =>
      typeof data[0][k] === "boolean" &&
      (k.startsWith("has_") ||
        k.startsWith("force_") ||
        k.startsWith("pass_") ||
        k.startsWith("uses_") ||
        k === "setState_in_raf")
  );

  // Находим различия
  // Missing: фичи, которые есть в champion (variant2), но отсутствуют в variant1
  // Present: фичи, которые есть в variant1, но отсутствуют в champion (variant2)
  const missing = []; // Фичи в champion, но не в variant1
  const present = []; // Фичи в variant1, но не в champion

  boolFeatures.forEach((key) => {
    const v1Has = variant1[key] === true;
    const v2Has = variant2[key] === true;

    if (!v1Has && v2Has) {
      missing.push(key); // Есть в champion, нет в variant1
    } else if (v1Has && !v2Has) {
      present.push(key); // Есть в variant1, нет в champion
    }
  });

  // Выводим результаты
  if (missing.length > 0) {
    console.log(`Missing: ${missing.join(", ")}`);
  } else {
    console.log(`Missing: нет`);
  }

  console.log();

  if (present.length > 0) {
    console.log(`Present: ${present.join(", ")}`);
  } else {
    console.log(`Present: нет`);
  }

  // Дополнительная информация
  console.log(`\n--- Дополнительная информация ---`);
  console.log(`${variant1Name}:`);
  console.log(`  Score: ${variant1.score || "N/A"}`);
  console.log(`  Signature: ${variant1.signature || "N/A"}`);
  console.log(`  ENGINE_CLASS: ${variant1.ENGINE_CLASS || "N/A"}`);
  console.log(`\n${variant2Name}:`);
  console.log(`  Score: ${variant2.score || "N/A"}`);
  console.log(`  Signature: ${variant2.signature || "N/A"}`);
  console.log(`  ENGINE_CLASS: ${variant2.ENGINE_CLASS || "N/A"}`);
}

function printHelp() {
  console.log(`
Использование: node data/scripts/process-variants.mjs [файл] [команда] [аргументы]

Если файл не указан, используется variants_features.json из той же директории, что и скрипт.

Команды:
  stats                          - общая статистика
  top [limit]                    - топ вариантов по score (по умолчанию 10)
  filter [criteria]              - фильтрация (JSON или key=value,key2=value2)
  search [features]              - поиск по фичам (через запятую)
  signatures                     - группировка по сигнатурам
  export [format] [output]       - экспорт (csv/json)
  compare [variant1] [variant2]  - сравнение вариантов
  novelty [limit]                - топ вариантов по novelty (уникальности)
  diff [variant1] [variant2]     - сравнение фич двух вариантов
  help                          - эта справка

Примеры:
  node data/scripts/process-variants.mjs stats
  node data/scripts/process-variants.mjs top 20
  node data/scripts/process-variants.mjs filter '{"has_threads":true,"score":{"min":15}}'
  node data/scripts/process-variants.mjs filter has_threads=true,score_min=15
  node data/scripts/process-variants.mjs search has_threads,has_clusters,has_hotspots
  node data/scripts/process-variants.mjs export csv filtered.csv
  node data/scripts/process-variants.mjs compare variant1 variant2
  node data/scripts/process-variants.mjs novelty 20
  node data/scripts/process-variants.mjs diff enginepromt guardfolio-ai---visual-engine
`);
}

async function main() {
  try {
    const data = loadData();
    console.log(`Загружено ${data.length} вариантов из ${INPUT_FILE}`);

    switch (COMMAND) {
      case "stats":
        printStats(data);
        break;

      case "top":
        const limit = process.argv[ARG_OFFSET] ? parseInt(process.argv[ARG_OFFSET]) : 10;
        printTop(data, limit);
        break;

      case "filter":
        const criteria = process.argv[ARG_OFFSET];
        if (!criteria) {
          console.error("Укажите критерии фильтрации");
          printHelp();
          process.exit(1);
        }
        printFiltered(data, criteria);
        break;

      case "search":
        const features = process.argv[ARG_OFFSET];
        if (!features) {
          console.error("Укажите фичи для поиска (через запятую)");
          printHelp();
          process.exit(1);
        }
        searchByFeatures(data, features);
        break;

      case "signatures":
        printSignatures(data);
        break;

      case "export":
        const format = process.argv[ARG_OFFSET] || "csv";
        const output = process.argv[ARG_OFFSET + 1] || `exported.${format}`;
        exportData(data, format, output);
        break;

      case "compare":
        const variants = process.argv.slice(ARG_OFFSET);
        if (variants.length < 2) {
          console.error("Укажите минимум 2 варианта для сравнения");
          printHelp();
          process.exit(1);
        }
        compareVariants(data, variants);
        break;

      case "novelty":
        const noveltyLimit = process.argv[ARG_OFFSET] ? parseInt(process.argv[ARG_OFFSET]) : 20;
        printNovelty(data, noveltyLimit);
        break;

      case "diff":
        const diffVariants = process.argv.slice(ARG_OFFSET);
        if (diffVariants.length < 2) {
          console.error("Укажите 2 варианта для сравнения");
          console.error("Пример: node data/scripts/process-variants.mjs diff enginepromt guardfolio-ai---visual-engine");
          printHelp();
          process.exit(1);
        }
        printDiff(data, diffVariants[0], diffVariants[1]);
        break;

      case "help":
      default:
        printHelp();
        break;
    }
  } catch (error) {
    console.error(`Ошибка: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

