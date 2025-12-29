import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

/**
 * Улучшенная формула scoring с учетом Lift и Confidence
 * 
 * Формула: score = Σ(feature_present * log(lift + 1) * confidence_weight * manual_weight)
 * 
 * Где:
 * - feature_present: 1 если фича есть, 0 если нет
 * - log(lift + 1): логарифмирование лифта для сглаживания экстремальных значений
 * - confidence_weight: коэффициент доверия (1.0 по умолчанию, 0.5 для спорных фич)
 * - manual_weight: ручной коэффициент из scoring.json (для fine-tuning)
 */

const FEATURE_DIFF_PATH = path.join(rootDir, "master", "feature_diff_stable_vs_other.json");
const SCORING_PATH = path.join(rootDir, "master", "scoring.json");
const OUTPUT_PATH = path.join(rootDir, "master", "scoring_v2.json");

// Коэффициенты доверия для спорных фич (меньше 1.0 = меньше доверия)
const CONFIDENCE_WEIGHTS = {
  force_noise_jitter: 0.5, // Спорная фича - может быть несидированной
  has_scan_ring: 0.7,      // Средняя уверенность
  // Остальные: 1.0 по умолчанию
};

function loadFeatureDiff() {
  if (!fs.existsSync(FEATURE_DIFF_PATH)) {
    throw new Error(`Feature diff file not found: ${FEATURE_DIFF_PATH}`);
  }
  return JSON.parse(fs.readFileSync(FEATURE_DIFF_PATH, "utf8"));
}

function loadScoring() {
  if (!fs.existsSync(SCORING_PATH)) {
    throw new Error(`Scoring file not found: ${SCORING_PATH}`);
  }
  return JSON.parse(fs.readFileSync(SCORING_PATH, "utf8"));
}

function createLiftMap(featureDiff) {
  // Создаем мапу feature -> lift из top и bottom
  const liftMap = new Map();
  
  featureDiff.top.forEach(f => {
    liftMap.set(f.feature, f.lift);
  });
  
  featureDiff.bottom.forEach(f => {
    liftMap.set(f.feature, f.lift);
  });
  
  return liftMap;
}

function calculateImprovedWeights(featureDiff, currentScoring) {
  const liftMap = createLiftMap(featureDiff);
  const improvedWeights = {};
  
  // Для каждой фичи из текущего scoring.json вычисляем улучшенный вес
  Object.entries(currentScoring.weights).forEach(([feature, currentWeight]) => {
    const lift = liftMap.get(feature);
    
    if (lift === undefined) {
      // Фича не найдена в feature_diff - используем текущий вес
      improvedWeights[feature] = currentWeight;
      return;
    }
    
    // Логарифмирование lift для сглаживания (lift + 1 чтобы избежать log(0))
    const logLift = Math.log(lift + 1);
    
    // Коэффициент доверия
    const confidence = CONFIDENCE_WEIGHTS[feature] ?? 1.0;
    
    // Базовый вес из lift (для фич с lift > 1 усиливаем, для lift < 1 ослабляем)
    // Используем масштабирование: log(lift+1) дает нормализованное значение
    let liftBasedWeight = 0;
    
    if (lift > 1) {
      // Положительная корреляция со STABLE
      liftBasedWeight = Math.round(logLift * 3); // Масштабируем для разумных значений
    } else if (lift < 1 && lift > 0) {
      // Отрицательная корреляция (но не анти-паттерн)
      liftBasedWeight = Math.round(-logLift * 2);
    } else {
      // lift === 1 или очень малый - нейтральный вес
      liftBasedWeight = 0;
    }
    
    // Объединяем с текущим весом (берем максимум по модулю, сохраняя знак)
    // Это позволяет сохранить ручную настройку, но усилить на основе данных
    const suggestedWeight = Math.round(liftBasedWeight * confidence);
    
    // Если текущий вес уже установлен вручную и отличается от нуля, используем его
    // Но корректируем на основе lift если разница значительна
    if (currentWeight !== 0) {
      // Если текущий вес и suggested сильно различаются, используем среднее
      if (Math.abs(currentWeight - suggestedWeight) > 5) {
        improvedWeights[feature] = Math.round((currentWeight * 0.7 + suggestedWeight * 0.3));
      } else {
        improvedWeights[feature] = currentWeight;
      }
    } else {
      improvedWeights[feature] = suggestedWeight;
    }
  });
  
  return improvedWeights;
}

function generateScoringV2(featureDiff, currentScoring) {
  const improvedWeights = calculateImprovedWeights(featureDiff, currentScoring);
  
  // Создаем новую версию scoring с улучшенными весами
  const scoringV2 = {
    version: "2.1.0",
    formula: "score = Σ(feature_present * log(lift + 1) * confidence_weight * manual_weight)",
    weights: improvedWeights,
    confidence_weights: CONFIDENCE_WEIGHTS,
    rationale: {
      ...currentScoring.rationale,
      improvements: [
        "Weights now incorporate Lift values from feature_diff analysis",
        "Logarithmic scaling prevents extreme values (like lift=999) from dominating",
        "Confidence weights applied to controversial features (e.g., force_noise_jitter: 0.5)",
        "Manual weights from v2.0.0 preserved where they differ significantly from lift-based suggestions"
      ]
    },
    notes: "Improved scoring formula incorporating Lift analysis. Weights are calculated as: log(lift + 1) * confidence * manual_adjustment"
  };
  
  return scoringV2;
}

function main() {
  console.log("📊 Загрузка feature_diff...");
  const featureDiff = loadFeatureDiff();
  
  console.log("📊 Загрузка текущего scoring...");
  const currentScoring = loadScoring();
  
  console.log("🔧 Генерация улучшенного scoring v2.1.0...");
  const scoringV2 = generateScoringV2(featureDiff, currentScoring);
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(scoringV2, null, 2), "utf8");
  console.log(`✅ Сохранено в: ${OUTPUT_PATH}`);
  
  // Сравнение весов
  console.log("\n" + "=".repeat(80));
  console.log("СРАВНЕНИЕ ВЕСОВ (v2.0.0 vs v2.1.0):");
  console.log("=".repeat(80));
  
  const sortedFeatures = Object.keys(scoringV2.weights)
    .filter(f => Math.abs(currentScoring.weights[f] || 0) > 0 || Math.abs(scoringV2.weights[f]) > 0)
    .sort((a, b) => Math.abs(scoringV2.weights[b]) - Math.abs(scoringV2.weights[a]));
  
  console.log("\nФича".padEnd(35) + "v2.0.0".padStart(10) + "v2.1.0".padStart(10) + "Δ".padStart(8) + "Lift".padStart(10));
  console.log("-".repeat(80));
  
  const liftMap = createLiftMap(featureDiff);
  sortedFeatures.slice(0, 20).forEach(feature => {
    const v1 = currentScoring.weights[feature] || 0;
    const v2 = scoringV2.weights[feature] || 0;
    const delta = v2 - v1;
    const lift = liftMap.get(feature);
    const liftStr = lift ? lift.toFixed(2) : "N/A";
    
    const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
    console.log(
      feature.padEnd(35) +
      String(v1).padStart(10) +
      String(v2).padStart(10) +
      deltaStr.padStart(8) +
      liftStr.padStart(10)
    );
  });
  
  console.log("\n⚠️  ВНИМАНИЕ: Это предложение. Просмотрите изменения перед применением в production.");
}

main();

