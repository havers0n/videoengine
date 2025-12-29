import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VARIANTS_ROOT = path.join(__dirname, "..");

/**
 * Скрипт для дедупликации вариантов по содержимому
 * 
 * Стратегия:
 * 1. Для каждого варианта находим ключевые файлы (App.tsx, главный canvas компонент)
 * 2. Нормализуем содержимое (удаляем пробелы, комментарии)
 * 3. Вычисляем хеш
 * 4. Группируем по хешу
 * 5. Предлагаем, какой вариант оставить (по score, размеру папки, имени)
 */

function listVariantDirs(root) {
  const abs = path.resolve(root);
  if (!fs.existsSync(abs)) throw new Error(`Folder not found: ${abs}`);
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "scripts" && d.name !== "node_modules")
    .map((d) => path.join(abs, d.name));
}

function findKeyFiles(dir) {
  // Приоритет: App.tsx, затем главный canvas компонент, затем самый большой TSX файл
  const patterns = [
    "App.tsx",
    "components/**/*.{ts,tsx}",
    "utils/**/*.{ts,tsx}",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/.next/**",
    "!**/build/**",
  ];
  
  const files = fg.sync(patterns, { cwd: dir, absolute: true, onlyFiles: true });
  
  // Приоритет 1: App.tsx
  const appTsx = files.find((f) => path.basename(f) === "App.tsx");
  if (appTsx) return [appTsx];
  
  // Приоритет 2: Ищем canvas-компоненты (по имени или содержимому)
  const canvasFiles = files.filter((f) => {
    const name = path.basename(f, path.extname(f)).toLowerCase();
    return name.includes("canvas") || name.includes("engine") || name.includes("simulation");
  });
  
  if (canvasFiles.length > 0) {
    // Берем самый большой файл
    const withSize = canvasFiles.map((f) => ({
      path: f,
      size: fs.statSync(f).size,
    }));
    withSize.sort((a, b) => b.size - a.size);
    return [withSize[0].path];
  }
  
  // Приоритет 3: Самый большой TSX файл
  const tsxFiles = files.filter((f) => f.endsWith(".tsx"));
  if (tsxFiles.length > 0) {
    const withSize = tsxFiles.map((f) => ({
      path: f,
      size: fs.statSync(f).size,
    }));
    withSize.sort((a, b) => b.size - a.size);
    return [withSize[0].path];
  }
  
  // Fallback: все TS/TSX файлы (но ограничиваем размером)
  return files.slice(0, 3);
}

function normalizeCode(text) {
  // Базовая нормализация: удаляем комментарии и лишние пробелы
  // Это не идеально, но достаточно для дедупликации
  
  // Удаляем однострочные комментарии
  let normalized = text.replace(/\/\/.*$/gm, "");
  
  // Удаляем многострочные комментарии
  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, "");
  
  // Удаляем лишние пробелы и переводы строк
  normalized = normalized.replace(/\s+/g, " ");
  
  // Удаляем пробелы в начале и конце
  normalized = normalized.trim();
  
  return normalized;
}

function computeHash(files, dir) {
  // Читаем содержимое ключевых файлов и вычисляем хеш
  const contents = [];
  
  for (const file of files) {
    try {
      const text = fs.readFileSync(file, "utf8");
      const normalized = normalizeCode(text);
      contents.push(normalized);
    } catch (e) {
      // Игнорируем ошибки чтения
    }
  }
  
  if (contents.length === 0) {
    return null;
  }
  
  const combined = contents.join("\n---FILE_SEPARATOR---\n");
  return crypto.createHash("sha256").update(combined).digest("hex");
}

function countFiles(dir) {
  try {
    const allFiles = fg.sync("**/*", { cwd: dir, absolute: true, onlyFiles: true, ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**"] });
    return allFiles.length;
  } catch (e) {
    return 0;
  }
}

function loadScores() {
  // Пытаемся загрузить scores из variants_features.json
  const featuresPath = path.join(__dirname, "..", "..", "variants_features.json");
  if (fs.existsSync(featuresPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(featuresPath, "utf8"));
      const scores = {};
      data.forEach((r) => {
        scores[r.variant] = r.score || 0;
      });
      return scores;
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  return {};
}

function analyzeDuplicates() {
  const dirs = listVariantDirs(VARIANTS_ROOT);
  const hashGroups = {};
  const scores = loadScores();
  
  console.log("Анализ вариантов на дубликаты по содержимому...\n");
  
  for (const dir of dirs) {
    const variantName = path.basename(dir);
    const keyFiles = findKeyFiles(dir);
    
    if (keyFiles.length === 0) {
      console.log(`  ⚠️  ${variantName}: не найдены ключевые файлы`);
      continue;
    }
    
    const hash = computeHash(keyFiles, dir);
    if (!hash) {
      console.log(`  ⚠️  ${variantName}: не удалось вычислить хеш`);
      continue;
    }
    
    if (!hashGroups[hash]) {
      hashGroups[hash] = [];
    }
    
    const fileCount = countFiles(dir);
    hashGroups[hash].push({
      variant: variantName,
      dir,
      fileCount,
      score: scores[variantName] || 0,
      keyFiles: keyFiles.map((f) => path.relative(dir, f)),
    });
  }
  
  // Фильтруем только группы с дубликатами (2+ варианта)
  const duplicates = Object.entries(hashGroups).filter(([hash, variants]) => variants.length > 1);
  
  return { duplicates, hashGroups };
}

function suggestKeep(variants) {
  // Стратегия выбора варианта для сохранения:
  // 1. Самый высокий score
  // 2. Если score одинаковый - самая короткая папка (меньше файлов)
  // 3. Если одинаково - лучшее имя (без (1), (2) и т.д.)
  
  const sorted = [...variants].sort((a, b) => {
    // Приоритет 1: score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Приоритет 2: меньше файлов
    if (a.fileCount !== b.fileCount) {
      return a.fileCount - b.fileCount;
    }
    // Приоритет 3: имя без (1), (2)
    const aIsDuplicate = /\(\d+\)$/.test(a.variant);
    const bIsDuplicate = /\(\d+\)$/.test(b.variant);
    if (aIsDuplicate !== bIsDuplicate) {
      return aIsDuplicate ? 1 : -1;
    }
    return 0;
  });
  
  return sorted[0];
}

function printReport({ duplicates, hashGroups }) {
  console.log("\n=== ОТЧЕТ: ДУБЛИКАТЫ ПО СОДЕРЖИМОМУ ===\n");
  
  if (duplicates.length === 0) {
    console.log("✓ Дубликатов не найдено");
    return;
  }
  
  console.log(`Найдено групп дубликатов: ${duplicates.length}\n`);
  
  duplicates.forEach(([hash, variants], idx) => {
    console.log(`--- Группа ${idx + 1} (${variants.length} вариантов) ---`);
    console.log(`Хеш: ${hash.substring(0, 16)}...`);
    
    const suggested = suggestKeep(variants);
    
    variants.forEach((v) => {
      const marker = v.variant === suggested.variant ? "⭐ KEEP" : "  REMOVE";
      console.log(
        `  ${marker} ${v.variant.padEnd(45)} score: ${String(v.score).padStart(3)}, файлов: ${v.fileCount}`
      );
      if (v.keyFiles.length > 0) {
        console.log(`      Ключевые файлы: ${v.keyFiles.join(", ")}`);
      }
    });
    console.log();
  });
  
  // Сводка
  const totalDuplicates = duplicates.reduce((sum, [_, variants]) => sum + variants.length - 1, 0);
  console.log(`\nВсего вариантов-дубликатов: ${totalDuplicates}`);
  console.log(`Можно удалить: ${totalDuplicates} вариантов`);
}

function generateDedupPlan({ duplicates }) {
  const plan = {
    groups: duplicates.map(([hash, variants]) => {
      const suggested = suggestKeep(variants);
      return {
        hash: hash.substring(0, 16),
        keep: suggested.variant,
        remove: variants.filter((v) => v.variant !== suggested.variant).map((v) => v.variant),
      };
    }),
    summary: {
      total_groups: duplicates.length,
      total_to_remove: duplicates.reduce((sum, [_, variants]) => sum + variants.length - 1, 0),
    },
  };
  
  return plan;
}

async function main() {
  const { duplicates, hashGroups } = analyzeDuplicates();
  printReport({ duplicates, hashGroups });
  
  if (duplicates.length > 0) {
    const plan = generateDedupPlan({ duplicates });
    const planPath = path.join(__dirname, "DEDUP_PLAN.json");
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
    
    console.log(`\n✓ План дедупликации сохранен: ${planPath}`);
    console.log(`\n⚠️  ВНИМАНИЕ: Этот скрипт НЕ удаляет файлы автоматически.`);
    console.log(`   Используйте план для ручного удаления или добавьте варианты в VARIANTS_IGNORE.json`);
  }
}

main().catch(console.error);

