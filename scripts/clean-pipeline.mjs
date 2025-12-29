import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VARIANTS_ROOT = path.join(__dirname, "..");
const REPORTS_DIR = path.join(__dirname, "..", "..", "reports");

/**
 * Пайплайн очистки и анализа
 * 
 * Шаги:
 * A. Генерация очищенного features файла (с применением ignore list + dedup filtering)
 * B. Вычисление stats/top/signatures/novelty на очищенном наборе
 * C. Вывод выводов: какие редкие фичи отсутствуют, какие кластеры перепроизведены
 * D. Генерация списка "prompt targets": 3-5 отсутствующих паттернов для Gemini
 */

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function loadIgnoreList() {
  const ignorePath = path.join(__dirname, "VARIANTS_IGNORE.json");
  if (fs.existsSync(ignorePath)) {
    try {
      const config = JSON.parse(fs.readFileSync(ignorePath, "utf8"));
      return new Set(config.variants || []);
    } catch (e) {
      console.warn(`⚠️  Не удалось загрузить VARIANTS_IGNORE.json: ${e.message}`);
    }
  }
  return new Set();
}

function loadDedupPlan() {
  const planPath = path.join(__dirname, "DEDUP_PLAN.json");
  if (fs.existsSync(planPath)) {
    try {
      const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
      const toRemove = new Set();
      plan.groups.forEach((group) => {
        group.remove.forEach((variant) => toRemove.add(variant));
      });
      return toRemove;
    } catch (e) {
      console.warn(`⚠️  Не удалось загрузить DEDUP_PLAN.json: ${e.message}`);
    }
  }
  return new Set();
}

function filterData(data, ignoreList, dedupRemove) {
  return data.filter((row) => {
    // Исключаем по ignore list
    if (ignoreList.has(row.variant)) {
      return false;
    }
    // Исключаем дубликаты
    if (dedupRemove.has(row.variant)) {
      return false;
    }
    return true;
  });
}

function analyzeMissingFeatures(data) {
  const total = data.length;
  
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
  
  // Находим редкие фичи (<= 10% или отсутствуют)
  const rareFeatures = boolFeatures
    .map((key) => {
      const count = data.filter((r) => r[key] === true).length;
      const pct = (count / total) * 100;
      return { key, count, pct };
    })
    .filter((f) => f.pct <= 10 && f.count > 0)
    .sort((a, b) => a.pct - b.pct);
  
  // Находим полностью отсутствующие фичи
  const missingFeatures = boolFeatures
    .map((key) => {
      const count = data.filter((r) => r[key] === true).length;
      return { key, count };
    })
    .filter((f) => f.count === 0)
    .map((f) => f.key);
  
  return { rareFeatures, missingFeatures };
}

function analyzeOverproducedClusters(data) {
  const sigFreq = {};
  data.forEach((r) => {
    sigFreq[r.signature] = (sigFreq[r.signature] || 0) + 1;
  });
  
  // Кластеры с 3+ вариантами считаются перепроизведенными
  const overproduced = Object.entries(sigFreq)
    .filter(([_, count]) => count >= 3)
    .map(([sig, count]) => ({ signature: sig, count }))
    .sort((a, b) => b.count - a.count);
  
  return overproduced;
}

function generatePromptTargets(data) {
  const { rareFeatures, missingFeatures } = analyzeMissingFeatures(data);
  
  // Целевые паттерны для генерации
  const targets = [];
  
  // 1. Стабильность-премиум паттерны
  const hasFixedTimestep = data.filter((r) => r.has_fixed_timestep).length;
  const hasDeterministicRNG = data.filter((r) => r.has_deterministic_rng).length;
  const hasStateRef = data.filter((r) => r.has_stateRef).length;
  
  if (hasFixedTimestep < data.length * 0.1) {
    targets.push({
      priority: "HIGH",
      pattern: "fixed_timestep",
      description: "Фиксированный timestep для стабильной физики",
      current_count: hasFixedTimestep,
      target_count: Math.ceil(data.length * 0.2),
    });
  }
  
  if (hasDeterministicRNG < data.length * 0.3) {
    targets.push({
      priority: "HIGH",
      pattern: "deterministic_rng",
      description: "Детерминированный RNG с seed для воспроизводимости",
      current_count: hasDeterministicRNG,
      target_count: Math.ceil(data.length * 0.5),
    });
  }
  
  // 2. Комбинации премиум-фич
  const hasPremiumCombo = data.filter(
    (r) => r.has_clusters && r.has_threads && r.has_hotspots && r.has_shadow_blur
  ).length;
  
  if (hasPremiumCombo < data.length * 0.15) {
    targets.push({
      priority: "MEDIUM",
      pattern: "clusters+threads+hotspots+shadowBlur",
      description: "Комбинация кластеров, нитей, хотспотов и размытия",
      current_count: hasPremiumCombo,
      target_count: Math.ceil(data.length * 0.25),
    });
  }
  
  // 3. Редкие фичи из списка
  rareFeatures.slice(0, 3).forEach((f) => {
    targets.push({
      priority: "MEDIUM",
      pattern: f.key,
      description: `Редкая фича: ${f.key} (сейчас ${f.count}, ${f.pct.toFixed(1)}%)`,
      current_count: f.count,
      target_count: Math.ceil(data.length * 0.15),
    });
  });
  
  return targets;
}

function generateReport(data, cleanData) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_variants: data.length,
      clean_variants: cleanData.length,
      excluded: data.length - cleanData.length,
    },
    missing_features: analyzeMissingFeatures(cleanData),
    overproduced_clusters: analyzeOverproducedClusters(cleanData),
    prompt_targets: generatePromptTargets(cleanData),
  };
  
  return report;
}

function printReport(report) {
  console.log("\n=== ОТЧЕТ ПАЙПЛАЙНА ОЧИСТКИ ===\n");
  
  console.log("--- Сводка ---");
  console.log(`Всего вариантов: ${report.summary.total_variants}`);
  console.log(`Очищенных вариантов: ${report.summary.clean_variants}`);
  console.log(`Исключено: ${report.summary.excluded}`);
  
  console.log("\n--- Отсутствующие/редкие фичи ---");
  if (report.missing_features.missingFeatures.length > 0) {
    console.log("Полностью отсутствуют:");
    report.missing_features.missingFeatures.forEach((f) => {
      console.log(`  - ${f}`);
    });
  }
  
  if (report.missing_features.rareFeatures.length > 0) {
    console.log("\nРедкие (<= 10%):");
    report.missing_features.rareFeatures.slice(0, 10).forEach((f) => {
      console.log(`  - ${f.key.padEnd(35)} ${f.count} (${f.pct.toFixed(1)}%)`);
    });
  }
  
  console.log("\n--- Перепроизведенные кластеры (3+ варианта) ---");
  if (report.overproduced_clusters.length > 0) {
    report.overproduced_clusters.slice(0, 10).forEach((c) => {
      console.log(`  ${c.signature.padEnd(30)} ${c.count} вариантов`);
    });
  } else {
    console.log("  Нет");
  }
  
  console.log("\n--- Целевые паттерны для Gemini (prompt targets) ---");
  report.prompt_targets.forEach((target, idx) => {
    console.log(`\n${idx + 1}. [${target.priority}] ${target.pattern}`);
    console.log(`   ${target.description}`);
    console.log(`   Текущее: ${target.current_count}, Цель: ${target.target_count}`);
  });
}

async function main() {
  console.log("Запуск пайплайна очистки и анализа...\n");
  
  ensureReportsDir();
  
  // Шаг A: Загружаем исходные данные и фильтруем
  const featuresPath = path.join(__dirname, "..", "..", "variants_features.json");
  if (!fs.existsSync(featuresPath)) {
    console.error(`❌ Файл не найден: ${featuresPath}`);
    console.error("   Сначала выполните: npm run analyze");
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(featuresPath, "utf8"));
  const ignoreList = loadIgnoreList();
  const dedupRemove = loadDedupPlan();
  
  console.log(`Загружено ${data.length} вариантов`);
  console.log(`Игнорируемых: ${ignoreList.size}`);
  console.log(`Дубликатов для удаления: ${dedupRemove.size}`);
  
  const cleanData = filterData(data, ignoreList, dedupRemove);
  console.log(`Очищенных вариантов: ${cleanData.length}\n`);
  
  // Сохраняем очищенный файл
  const cleanPath = path.join(__dirname, "..", "..", "variants_features_clean.json");
  fs.writeFileSync(cleanPath, JSON.stringify(cleanData, null, 2), "utf8");
  console.log(`✓ Сохранен очищенный файл: ${cleanPath}`);
  
  // Шаг B: Вычисляем статистику на очищенном наборе
  console.log("\n--- Статистика на очищенном наборе ---");
  try {
    const statsOutput = execSync(
      `node "${path.join(__dirname, "process-variants.mjs")}" "${cleanPath}" stats`,
      { encoding: "utf8", cwd: path.join(__dirname, "..", "..") }
    );
    console.log(statsOutput);
  } catch (e) {
    console.warn(`⚠️  Ошибка при выполнении stats: ${e.message}`);
  }
  
  // Шаг C: Генерируем отчет
  const report = generateReport(data, cleanData);
  printReport(report);
  
  // Сохраняем отчет
  const reportPath = path.join(REPORTS_DIR, `latest-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  
  // Также сохраняем как latest.md для удобства чтения
  const markdownPath = path.join(REPORTS_DIR, "latest.md");
  const markdown = `# Отчет пайплайна очистки

**Дата:** ${new Date(report.timestamp).toLocaleString("ru-RU")}

## Сводка

- Всего вариантов: ${report.summary.total_variants}
- Очищенных вариантов: ${report.summary.clean_variants}
- Исключено: ${report.summary.excluded}

## Отсутствующие/редкие фичи

### Полностью отсутствуют:
${report.missing_features.missingFeatures.map((f) => `- ${f}`).join("\n") || "Нет"}

### Редкие (<= 10%):
${report.missing_features.rareFeatures
  .slice(0, 10)
  .map((f) => `- ${f.key}: ${f.count} (${f.pct.toFixed(1)}%)`)
  .join("\n") || "Нет"}

## Перепроизведенные кластеры

${report.overproduced_clusters
  .slice(0, 10)
  .map((c) => `- ${c.signature}: ${c.count} вариантов`)
  .join("\n") || "Нет"}

## Целевые паттерны для Gemini

${report.prompt_targets
  .map(
    (t, idx) => `
### ${idx + 1}. [${t.priority}] ${t.pattern}

${t.description}

- Текущее количество: ${t.current_count}
- Целевое количество: ${t.target_count}
`
  )
  .join("\n")}
`;
  
  fs.writeFileSync(markdownPath, markdown, "utf8");
  
  console.log(`\n✓ Отчет сохранен:`);
  console.log(`  JSON: ${reportPath}`);
  console.log(`  Markdown: ${markdownPath}`);
}

main().catch(console.error);

