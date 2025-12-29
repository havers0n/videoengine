import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VARIANTS_ROOT = path.join(__dirname, "..");

/**
 * Скрипт для выявления мусора, шаблонов и дубликатов
 * 
 * Критерии исключения:
 * - Большие папки (50+ файлов) - вероятно шаблоны/полные приложения
 * - Папки без TS/TSX файлов
 * - Дубликаты по имени (с (1), (2) и т.д.)
 */

function listVariantDirs(root) {
  const abs = path.resolve(root);
  if (!fs.existsSync(abs)) throw new Error(`Folder not found: ${abs}`);
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "scripts" && d.name !== "node_modules")
    .map((d) => path.join(abs, d.name));
}

function countFiles(dir) {
  try {
    const allFiles = fg.sync("**/*", { cwd: dir, absolute: true, onlyFiles: true, ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**"] });
    return allFiles.length;
  } catch (e) {
    return 0;
  }
}

function countTSFiles(dir) {
  try {
    const tsFiles = fg.sync("**/*.{ts,tsx}", { cwd: dir, absolute: true, onlyFiles: true, ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**"] });
    return tsFiles.length;
  } catch (e) {
    return 0;
  }
}

function isDuplicateName(name) {
  // Проверяем на паттерн "name (1)", "name (2)" и т.д.
  return /^(.+)\s+\(\d+\)$/.test(name);
}

function getBaseName(name) {
  const match = name.match(/^(.+)\s+\(\d+\)$/);
  return match ? match[1] : name;
}

function analyzeVariants() {
  const dirs = listVariantDirs(VARIANTS_ROOT);
  const results = [];

  for (const dir of dirs) {
    const variantName = path.basename(dir);
    const fileCount = countFiles(dir);
    const tsFileCount = countTSFiles(dir);
    
    const reasons = [];
    
    // Критерий 1: Большие папки (50+ файлов) - вероятно шаблоны
    if (fileCount >= 50) {
      reasons.push("boilerplate");
    }
    
    // Критерий 2: Нет TS/TSX файлов
    if (tsFileCount === 0) {
      reasons.push("no_ts");
    }
    
    // Критерий 3: Дубликат по имени
    if (isDuplicateName(variantName)) {
      reasons.push("duplicate_name");
    }
    
    results.push({
      variant: variantName,
      file_count: fileCount,
      ts_file_count: tsFileCount,
      reason_to_exclude: reasons.length > 0 ? reasons.join(", ") : null,
      is_duplicate_name: isDuplicateName(variantName),
      base_name: getBaseName(variantName),
    });
  }

  return results;
}

function printReport(results) {
  console.log("\n=== ОТЧЕТ: КАНДИДАТЫ НА ИСКЛЮЧЕНИЕ ===\n");
  
  const toExclude = results.filter((r) => r.reason_to_exclude);
  const duplicates = results.filter((r) => r.is_duplicate_name);
  
  console.log(`Всего вариантов: ${results.length}`);
  console.log(`Кандидатов на исключение: ${toExclude.length}`);
  console.log(`Дубликатов по имени: ${duplicates.length}\n`);
  
  if (toExclude.length > 0) {
    console.log("--- Таблица кандидатов на исключение ---");
    console.log("Вариант".padEnd(50), "Файлов".padStart(8), "TS/TSX".padStart(8), "Причина");
    console.log("-".repeat(100));
    
    toExclude
      .sort((a, b) => b.file_count - a.file_count)
      .forEach((r) => {
        console.log(
          r.variant.padEnd(50),
          String(r.file_count).padStart(8),
          String(r.ts_file_count).padStart(8),
          r.reason_to_exclude
        );
      });
  }
  
  if (duplicates.length > 0) {
    console.log("\n--- Группы дубликатов по имени ---");
    const groups = {};
    duplicates.forEach((r) => {
      const base = r.base_name;
      if (!groups[base]) groups[base] = [];
      groups[base].push(r.variant);
    });
    
    Object.entries(groups).forEach(([base, variants]) => {
      console.log(`\n${base}:`);
      variants.forEach((v) => {
        const info = results.find((r) => r.variant === v);
        console.log(`  - ${v} (${info.file_count} файлов, ${info.ts_file_count} TS/TSX)`);
      });
    });
  }
  
  // Статистика по размерам
  console.log("\n--- Статистика по размерам ---");
  const sizeGroups = {
    small: results.filter((r) => r.file_count < 10).length,
    medium: results.filter((r) => r.file_count >= 10 && r.file_count < 30).length,
    large: results.filter((r) => r.file_count >= 30 && r.file_count < 50).length,
    huge: results.filter((r) => r.file_count >= 50).length,
  };
  
  console.log(`Малые (<10 файлов): ${sizeGroups.small}`);
  console.log(`Средние (10-29 файлов): ${sizeGroups.medium}`);
  console.log(`Большие (30-49 файлов): ${sizeGroups.large}`);
  console.log(`Огромные (50+ файлов): ${sizeGroups.huge}`);
}

function generateIgnoreConfig(results) {
  const toExclude = results.filter((r) => r.reason_to_exclude);
  const ignoreList = toExclude.map((r) => r.variant);
  
  return {
    variants: ignoreList,
    patterns: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
    ],
    notes: "Автоматически сгенерированный список вариантов для исключения из анализа",
  };
}

async function main() {
  console.log("Анализ вариантов на предмет мусора, шаблонов и дубликатов...\n");
  
  const results = analyzeVariants();
  printReport(results);
  
  // Генерируем конфиг для игнорирования
  const ignoreConfig = generateIgnoreConfig(results);
  const ignorePath = path.join(__dirname, "VARIANTS_IGNORE.json");
  fs.writeFileSync(ignorePath, JSON.stringify(ignoreConfig, null, 2), "utf8");
  
  console.log(`\n✓ Конфиг для игнорирования сохранен: ${ignorePath}`);
  console.log(`\nРекомендации:`);
  console.log(`1. Проверьте список кандидатов на исключение`);
  console.log(`2. Используйте VARIANTS_IGNORE.json в скрипте analyze-variants.mjs`);
  console.log(`3. Для дубликатов по имени - решите, какой вариант оставить`);
}

main().catch(console.error);

