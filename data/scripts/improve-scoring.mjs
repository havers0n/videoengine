import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FEATURES_FILE = path.join(__dirname, "..", "..", "variants_features.json");

/**
 * Анализ качества фич и предложения по улучшению scoring
 * 
 * Задачи:
 * 1. Выявить "слишком частые" фичи (низкая информативность)
 * 2. Выявить "стабильность-премиум" фичи (должны весить больше)
 * 3. Выявить анти-паттерны
 * 4. Предложить новые веса и дополнительные метрики
 */

function loadData() {
  if (!fs.existsSync(FEATURES_FILE)) {
    throw new Error(`Файл не найден: ${FEATURES_FILE}`);
  }
  const content = fs.readFileSync(FEATURES_FILE, "utf8");
  return JSON.parse(content);
}

function analyzeFeatureQuality(data) {
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
  
  const featureStats = boolFeatures.map((key) => {
    const count = data.filter((r) => r[key] === true).length;
    const pct = (count / total) * 100;
    return { key, count, pct };
  });
  
  // Слишком частые (>= 80%) - низкая информативность
  const tooCommon = featureStats.filter((f) => f.pct >= 80);
  
  // Редкие (<= 20%) - высокая информативность
  const rare = featureStats.filter((f) => f.pct <= 20 && f.count > 0);
  
  // Средние (20-80%) - хорошая информативность
  const medium = featureStats.filter((f) => f.pct > 20 && f.pct < 80);
  
  return { tooCommon, rare, medium, featureStats };
}

function identifyStabilityFeatures(data) {
  // Фичи, которые указывают на стабильность
  const stabilityFeatures = [
    "has_fixed_timestep",
    "has_deterministic_rng",
    "has_stateRef",
    "uses_performance_now",
  ];
  
  const stabilityStats = stabilityFeatures.map((key) => {
    const count = data.filter((r) => r[key] === true).length;
    const pct = (count / data.length) * 100;
    return { key, count, pct };
  });
  
  return stabilityStats;
}

function identifyAntiPatterns(data) {
  const antiPatterns = [
    {
      key: "setState_in_raf",
      description: "setState вызывается внутри RAF (нестабильно)",
      count: data.filter((r) => r.setState_in_raf).length,
    },
    {
      key: "uses_date_now",
      description: "Использует Date.now() вместо performance.now()",
      count: data.filter((r) => r.uses_date_now && !r.uses_performance_now).length,
    },
    {
      key: "no_deterministic_rng",
      description: "Нет детерминированного RNG (использует Math.random())",
      count: data.filter((r) => !r.has_deterministic_rng).length,
    },
  ];
  
  return antiPatterns;
}

function calculateStabilityScore(row) {
  // Отдельный score для стабильности
  let stability = 0;
  
  // Премиум стабильность (высокий вес)
  if (row.has_fixed_timestep) stability += 5;
  if (row.has_deterministic_rng) stability += 4;
  if (row.has_stateRef) stability += 3;
  if (row.uses_performance_now) stability += 2;
  
  // Анти-паттерны (штрафы)
  if (row.setState_in_raf) stability -= 10;
  if (row.uses_date_now && !row.uses_performance_now) stability -= 3;
  
  return stability;
}

function calculatePremiumScore(row) {
  // Отдельный score для премиум-фич (визуальная привлекательность + стабильность)
  let premium = 0;
  
  // Визуальные премиум-фичи
  if (row.has_clusters && row.has_threads && row.has_hotspots) premium += 5;
  if (row.has_shadow_blur) premium += 3;
  if (row.has_trails) premium += 2;
  if (row.has_gradients) premium += 1;
  
  // Физика премиум
  if (row.force_spring) premium += 2;
  if (row.force_damping_mul) premium += 2;
  if (row.force_noise_jitter) premium += 1;
  
  // Стабильность премиум
  if (row.has_fixed_timestep) premium += 3;
  if (row.has_deterministic_rng) premium += 2;
  
  return premium;
}

function proposeNewWeights() {
  // Предлагаемые новые веса для scoring
  return {
    // Базовые требования (без изменений)
    has_canvas_2d: 2,
    has_raf: 2,
    setState_in_raf: -5, // штраф
    
    // Стабильность-премиум (увеличенные веса)
    has_fixed_timestep: 3, // было 1, стало 3
    has_deterministic_rng: 3, // новое
    has_stateRef: 2, // новое
    uses_performance_now: 2, // новое
    uses_date_now: -2, // новое (штраф)
    
    // Guardfolio semantics (без изменений)
    has_threads: 2,
    has_clusters: 2,
    has_hotspots: 1,
    
    // Premium look (без изменений)
    has_trails: 2,
    has_shadow_blur: 2,
    has_gradients: 1,
    
    // Stability physics (без изменений)
    force_spring: 2,
    force_damping_mul: 2,
    force_noise_jitter: 1,
    
    // Production ready (без изменений)
    has_resize: 1,
    has_cancel_raf: 1,
    
    // Низкоинформативные фичи (можно убрать или снизить вес)
    has_teal: 0, // слишком часто (83%)
    has_red: 0, // слишком часто (80%)
    uses_ts_from_raf: 0, // слишком часто (73%)
  };
}

function printReport(data) {
  console.log("\n=== АНАЛИЗ КАЧЕСТВА ФИЧ И SCORING ===\n");
  
  const { tooCommon, rare, medium, featureStats } = analyzeFeatureQuality(data);
  const stabilityStats = identifyStabilityFeatures(data);
  const antiPatterns = identifyAntiPatterns(data);
  
  console.log("--- Слишком частые фичи (низкая информативность, >= 80%) ---");
  if (tooCommon.length > 0) {
    tooCommon.forEach((f) => {
      console.log(`  ${f.key.padEnd(35)} ${String(f.count).padStart(3)} (${f.pct.toFixed(1)}%)`);
    });
    console.log("\n  Рекомендация: снизить вес или исключить из scoring");
  } else {
    console.log("  Нет");
  }
  
  console.log("\n--- Редкие фичи (высокая информативность, <= 20%) ---");
  if (rare.length > 0) {
    rare.forEach((f) => {
      console.log(`  ${f.key.padEnd(35)} ${String(f.count).padStart(3)} (${f.pct.toFixed(1)}%)`);
    });
    console.log("\n  Рекомендация: увеличить вес в scoring");
  } else {
    console.log("  Нет");
  }
  
  console.log("\n--- Стабильность-премиум фичи ---");
  stabilityStats.forEach((f) => {
    const status = f.pct < 30 ? "⭐ РЕДКАЯ" : f.pct < 60 ? "✓ СРЕДНЯЯ" : "⚠️  ЧАСТАЯ";
    console.log(`  ${f.key.padEnd(35)} ${String(f.count).padStart(3)} (${f.pct.toFixed(1)}%) ${status}`);
  });
  console.log("\n  Рекомендация: увеличить вес для этих фич");
  
  console.log("\n--- Анти-паттерны ---");
  antiPatterns.forEach((ap) => {
    console.log(`  ${ap.key.padEnd(35)} ${String(ap.count).padStart(3)} - ${ap.description}`);
  });
  
  // Предлагаемые новые веса
  console.log("\n--- Предлагаемые новые веса для scoring ---");
  const newWeights = proposeNewWeights();
  Object.entries(newWeights)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([key, weight]) => {
      const sign = weight >= 0 ? "+" : "";
      console.log(`  ${key.padEnd(35)} ${sign}${weight}`);
    });
  
  // Вычисляем новые метрики для существующих данных
  console.log("\n--- Новые метрики (stability_score, premium_score) ---");
  const withNewMetrics = data.map((row) => ({
    ...row,
    stability_score: calculateStabilityScore(row),
    premium_score: calculatePremiumScore(row),
  }));
  
  // Топ по stability_score
  const topStability = [...withNewMetrics]
    .sort((a, b) => b.stability_score - a.stability_score)
    .slice(0, 5);
  
  console.log("\nТоп-5 по stability_score:");
  topStability.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.variant.padEnd(45)} stability: ${String(r.stability_score).padStart(3)}, score: ${r.score}`);
  });
  
  // Топ по premium_score
  const topPremium = [...withNewMetrics]
    .sort((a, b) => b.premium_score - a.premium_score)
    .slice(0, 5);
  
  console.log("\nТоп-5 по premium_score:");
  topPremium.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.variant.padEnd(45)} premium: ${String(r.premium_score).padStart(3)}, score: ${r.score}`);
  });
  
  // Сохраняем предложения
  const proposal = {
    new_weights: newWeights,
    rationale: {
      too_common_features: tooCommon.map((f) => f.key),
      rare_features: rare.map((f) => f.key),
      stability_features: stabilityStats.map((f) => f.key),
      anti_patterns: antiPatterns.map((ap) => ap.key),
    },
    recommended_changes: [
      "Увеличить вес has_fixed_timestep с 1 до 3",
      "Добавить has_deterministic_rng с весом 3",
      "Добавить has_stateRef с весом 2",
      "Добавить uses_performance_now с весом 2",
      "Добавить штраф uses_date_now: -2",
      "Исключить has_teal и has_red из scoring (слишком частые)",
      "Добавить отдельные метрики: stability_score и premium_score",
    ],
  };
  
  const proposalPath = path.join(__dirname, "SCORING_PROPOSAL.json");
  fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2), "utf8");
  
  console.log(`\n✓ Предложение по улучшению scoring сохранено: ${proposalPath}`);
}

async function main() {
  const data = loadData();
  printReport(data);
}

main().catch(console.error);

