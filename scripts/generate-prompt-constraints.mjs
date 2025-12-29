import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

/**
 * Генератор системного промпта для Gemini на основе анализа feature_diff
 * 
 * Использует данные из master/feature_diff_stable_vs_other.json для создания:
 * - Hard Constraints (Lift > 100): обязательные требования
 * - Soft Hints (Lift > 2): рекомендации
 * - Negative Constraints (Lift < 0.1 или анти-паттерны): запреты
 */

const FEATURE_DIFF_PATH = path.join(rootDir, "master", "feature_diff_stable_vs_other.json");
const OUTPUT_PATH = path.join(rootDir, "master", "prompt_constraints.md");

// Маппинг фич на человекочитаемые инструкции
const FEATURE_INSTRUCTIONS = {
  has_fixed_timestep: {
    hard: "You MUST use a fixed timestep approach with an accumulator loop pattern (Fix Your Timestep by Glenn Fiedler). Use a fixed delta time (e.g., FIXED_DT = 1/60) and accumulate frame time until it's processed.",
    description: "Fixed timestep is critical for deterministic physics simulation"
  },
  has_accumulator_loop: {
    soft: "It is recommended to implement an accumulator loop pattern: while (accumulator >= FIXED_DT) { update(FIXED_DT); accumulator -= FIXED_DT; }",
    description: "Accumulator loop ensures consistent physics updates regardless of frame rate"
  },
  force_noise_jitter: {
    soft: "If using noise/jitter for force calculations, ensure it uses a deterministic seeded RNG, not Math.random(). This prevents particle gridlocking (sleeping bodies issue).",
    description: "Deterministic noise prevents visual artifacts while maintaining stability"
  },
  has_clusters: {
    soft: "It is recommended to organize entities into clusters or spatial structures for performance and visual appeal.",
    description: "Clusters improve both performance and visual organization"
  },
  has_deterministic_rng: {
    hard: "You MUST use a deterministic, seed-based RNG for any randomness. Never use Math.random() or Date.now() in the update loop.",
    description: "Deterministic RNG is required for reproducible simulations"
  },
  uses_performance_now: {
    hard: "You MUST use performance.now() for timing, never Date.now().",
    description: "performance.now() provides high-resolution monotonic time"
  },
  uses_date_now: {
    negative: "Do NOT use Date.now() for timing calculations. Use performance.now() instead.",
    description: "Date.now() is not monotonic and causes non-deterministic behavior"
  },
  setState_in_raf: {
    negative: "Do NOT call setState or useState setters inside requestAnimationFrame or update loops. Use useRef for state that changes every frame.",
    description: "setState in RAF causes React re-renders every frame, breaking performance"
  },
  has_stateRef: {
    soft: "It is recommended to use useRef for mutable state that changes in the animation loop, instead of useState.",
    description: "useRef avoids unnecessary React re-renders"
  },
  has_tracks_system: {
    soft: "Consider implementing a tracks/timeline system for keyframe-based animations if your use case requires temporal control.",
    description: "Tracks system enables precise animation control"
  },
  force_spring: {
    soft: "Spring forces can add natural, organic motion to particles.",
    description: "Spring forces create appealing physics interactions"
  },
  force_damping_mul: {
    soft: "Apply damping (velocity *= damping_factor) to prevent infinite acceleration and create more stable simulations.",
    description: "Damping prevents numerical instability"
  },
};

// Анти-паттерны с отрицательными весами
const ANTI_PATTERNS = {
  setState_in_raf: "Do NOT call React state setters (setState, useState setters) inside requestAnimationFrame or animation loops. Use useRef for frame-by-frame mutable state.",
  uses_date_now: "Do NOT use Date.now() for timing. Use performance.now() instead.",
  uses_math_random: "Do NOT use Math.random() without a deterministic seed. Use a seeded RNG if randomness is needed.",
};

function loadFeatureDiff() {
  if (!fs.existsSync(FEATURE_DIFF_PATH)) {
    throw new Error(`Feature diff file not found: ${FEATURE_DIFF_PATH}`);
  }
  return JSON.parse(fs.readFileSync(FEATURE_DIFF_PATH, "utf8"));
}

function generatePromptConstraints(featureDiff) {
  const { top, bottom, meta } = featureDiff;

  // Hard Constraints: Lift > 100 или абсолютные gatekeepers
  const hardConstraints = [];
  
  // has_fixed_timestep - абсолютный gatekeeper (Lift: 999)
  if (top.find(f => f.feature === "has_fixed_timestep")) {
    hardConstraints.push(FEATURE_INSTRUCTIONS.has_fixed_timestep.hard);
  }

  // Другие высокие lift (Lift > 100)
  top.filter(f => f.lift > 100 && f.feature !== "has_fixed_timestep").forEach(f => {
    const instruction = FEATURE_INSTRUCTIONS[f.feature];
    if (instruction?.hard) {
      hardConstraints.push(instruction.hard);
    }
  });

  // Soft Hints: 2 < Lift <= 100
  const softHints = [];
  top.filter(f => f.lift > 2 && f.lift <= 100).forEach(f => {
    const instruction = FEATURE_INSTRUCTIONS[f.feature];
    if (instruction?.soft) {
      softHints.push(`- ${instruction.soft}`);
    }
  });

  // Negative Constraints: низкий lift или анти-паттерны
  const negativeConstraints = [];
  
  // Анти-паттерны из классификатора
  Object.entries(ANTI_PATTERNS).forEach(([feature, instruction]) => {
    negativeConstraints.push(instruction);
  });

  // Фичи с очень низким lift (< 0.5) из bottom
  bottom.slice(0, 10).forEach(f => {
    const instruction = FEATURE_INSTRUCTIONS[f.feature];
    if (instruction?.negative) {
      negativeConstraints.push(instruction.negative);
    }
  });

  // Формируем Markdown документ
  const markdown = `# System Prompt Constraints для Gemini

> Автоматически сгенерировано из master/feature_diff_stable_vs_other.json
> Дата: ${new Date().toISOString()}
> Всего вариантов: ${meta.total} (STABLE: ${meta.stable}, OTHER: ${meta.other})

## Hard Constraints (ОБЯЗАТЕЛЬНО)

Эти требования должны быть включены в системный промпт как обязательные:

${hardConstraints.map((c, i) => `${i + 1}. ${c}`).join("\n\n")}

## Soft Hints (РЕКОМЕНДУЕТСЯ)

Эти рекомендации можно включить в системный промпт для улучшения качества:

${softHints.join("\n\n")}

## Negative Constraints (ЗАПРЕЩЕНО)

Эти паттерны должны быть явно запрещены:

${negativeConstraints.map((c, i) => `${i + 1}. ${c}`).join("\n\n")}

---

## Статистика по Lift

### Топ-10 признаков для STABLE (высокий Lift):
${top.slice(0, 10).map(f => `- \`${f.feature}\`: Lift=${f.lift}, p_stable=${f.p_stable}, coverage=${f.coverage}%`).join("\n")}

### Топ-10 признаков, НЕ характерных для STABLE (низкий Lift):
${bottom.slice(0, 10).map(f => `- \`${f.feature}\`: Lift=${f.lift.toFixed(2)}, p_stable=${f.p_stable}, coverage=${f.coverage}%`).join("\n")}

---

## Использование

Скопируйте разделы "Hard Constraints" и "Negative Constraints" в системный промпт для Gemini.
Раздел "Soft Hints" можно использовать как рекомендации или включить выборочно.
`;

  return markdown;
}

function main() {
  console.log("📊 Загрузка feature_diff...");
  const featureDiff = loadFeatureDiff();

  console.log("✍️  Генерация prompt constraints...");
  const constraints = generatePromptConstraints(featureDiff);

  fs.writeFileSync(OUTPUT_PATH, constraints, "utf8");
  console.log(`✅ Сохранено в: ${OUTPUT_PATH}`);

  // Также выводим краткую версию в консоль
  console.log("\n" + "=".repeat(80));
  console.log("КРАТКАЯ ВЕРСИЯ (для системного промпта):");
  console.log("=".repeat(80));
  
  const featureDiffData = loadFeatureDiff();
  const topFixedTimestep = featureDiffData.top.find(f => f.feature === "has_fixed_timestep");
  if (topFixedTimestep) {
    console.log("\n[HARD CONSTRAINT]");
    console.log(FEATURE_INSTRUCTIONS.has_fixed_timestep.hard);
  }

  console.log("\n[NEGATIVE CONSTRAINTS]");
  console.log(ANTI_PATTERNS.setState_in_raf);
  console.log(ANTI_PATTERNS.uses_date_now);
  console.log(ANTI_PATTERNS.uses_math_random);
}

main();

