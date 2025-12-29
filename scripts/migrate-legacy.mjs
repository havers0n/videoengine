import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

/**
 * Скрипт миграции текущих данных из data/ в runs/legacy_01/
 * 
 * Использование:
 *   npm run migrate:legacy
 * 
 * Процесс:
 *   1. Копирует все варианты из data/ в runs/legacy_01/extracted/
 *   2. Нормализует в runs/legacy_01/variants/
 *   3. Запускает анализ
 *   4. Создает baseline master dataset
 */

const LEGACY_RUN = path.join(PROJECT_ROOT, "runs", "legacy_01");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const EXTRACTED_DIR = path.join(LEGACY_RUN, "extracted");
const VARIANTS_DIR = path.join(LEGACY_RUN, "variants");
const REPORTS_DIR = path.join(LEGACY_RUN, "reports");

console.log("\n=== Миграция legacy данных ===\n");

// Проверка существования data/
if (!fs.existsSync(DATA_DIR)) {
  console.error(`❌ Директория data/ не найдена: ${DATA_DIR}`);
  process.exit(1);
}

// Создание структуры legacy run
[EXTRACTED_DIR, VARIANTS_DIR, REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Создана директория: ${dir}`);
  }
});

/**
 * Копирование директории с фильтрацией
 */
function copyDirectory(src, dest) {
  const ignorePatterns = [
    /node_modules/,
    /\.git/,
    /dist/,
    /\.next/,
    /build/,
    /coverage/,
    /__tests__/,
    /\.test\./,
    /\.spec\./,
    /scripts/,
  ];
  
  function shouldIgnore(filePath) {
    const relPath = path.relative(src, filePath).replace(/\\/g, '/');
    return ignorePatterns.some(pattern => pattern.test(relPath));
  }
  
  function copyRecursive(srcDir, destDir) {
    const stat = fs.lstatSync(srcDir);
    
    if (stat.isDirectory()) {
      fs.mkdirSync(destDir, { recursive: true });
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        
        if (shouldIgnore(srcPath)) {
          continue;
        }
        
        copyRecursive(srcPath, destPath);
      }
      return;
    }
    
    // file - создаем родительскую директорию перед копированием
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
    try {
      fs.copyFileSync(srcDir, destDir);
    } catch (e) {
      // Если source реально отсутствует/битый — не валим весь run
      if (e && e.code === "ENOENT") {
        console.warn(`⚠️  skip missing: ${srcDir}`);
        return;
      }
      throw e;
    }
  }
  
  copyRecursive(src, dest);
}

/**
 * Поиск ключевых файлов для определения структуры варианта
 */
function findKeyFiles(dir) {
  const keyFiles = [
    "App.tsx",
    "main.tsx",
    "index.tsx",
    "src/App.tsx",
    "src/main.tsx",
    "app/App.tsx",
  ];
  
  for (const keyFile of keyFiles) {
    const fullPath = path.join(dir, keyFile);
    if (fs.existsSync(fullPath)) {
      return keyFile;
    }
  }
  return null;
}

/**
 * Нормализация варианта
 */
function normalizeVariant(extractedPath, variantName) {
  const variantPath = path.join(VARIANTS_DIR, variantName);
  
  if (fs.existsSync(variantPath)) {
    console.log(`  ⚠️  Вариант ${variantName} уже существует, пропускаем`);
    return variantPath;
  }
  
  fs.mkdirSync(variantPath, { recursive: true });
  
  const keyFile = findKeyFiles(extractedPath);
  
  if (!keyFile) {
    // Копируем всё содержимое
    copyDirectory(extractedPath, variantPath);
  } else {
    // Определяем корень проекта
    const keyFileDir = path.dirname(keyFile);
    const projectRoot = keyFileDir === "." ? extractedPath : path.join(extractedPath, keyFileDir);
    copyDirectory(projectRoot, variantPath);
  }
  
  return variantPath;
}

async function main() {
  // 1. Копирование вариантов из data/ в extracted/
  console.log("📦 Копирование вариантов из data/...");
  
  const variantDirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith(".") && d.name !== "scripts" && d.name !== "node_modules")
    .map(d => ({
      name: d.name,
      path: path.join(DATA_DIR, d.name),
    }));
  
  console.log(`Найдено вариантов: ${variantDirs.length}`);
  
  for (const variant of variantDirs) {
    const extractedPath = path.join(EXTRACTED_DIR, variant.name);
    
    if (fs.existsSync(extractedPath)) {
      console.log(`  ⚠️  ${variant.name}: уже существует в extracted/, пропускаем`);
      continue;
    }
    
    // Создаем папку назначения перед копированием
    fs.mkdirSync(extractedPath, { recursive: true });
    
    console.log(`  📁 ${variant.name}`);
    copyDirectory(variant.path, extractedPath);
    
    // 2. Нормализация
    normalizeVariant(extractedPath, variant.name);
  }
  
  // 3. Запуск анализа
  console.log("\n=== Запуск анализа ===");
  
  const analyzeScript = path.join(PROJECT_ROOT, "data", "scripts", "analyze-variants.mjs");
  const outJson = path.join(REPORTS_DIR, "variants_features.json");
  const outCsv = path.join(REPORTS_DIR, "variants_features.csv");
  
  try {
    execSync(
      `node "${analyzeScript}" "${VARIANTS_DIR}" null "${outCsv}" "${outJson}"`,
      { cwd: PROJECT_ROOT, stdio: "inherit" }
    );
    console.log(`✓ Анализ завершен`);
  } catch (error) {
    console.error(`❌ Ошибка при анализе: ${error.message}`);
    process.exit(1);
  }
  
  // 4. Создание baseline master dataset
  console.log("\n=== Создание baseline master dataset ===");
  
  const masterDatasetPath = path.join(PROJECT_ROOT, "master", "dataset.json");
  const runData = JSON.parse(fs.readFileSync(outJson, "utf8"));
  
  // Добавляем run_id к каждому варианту
  const enrichedData = runData.map(v => ({
    ...v,
    run_id: "legacy_01",
    ingested_at: new Date().toISOString(),
  }));
  
  fs.writeFileSync(masterDatasetPath, JSON.stringify(enrichedData, null, 2), "utf8");
  console.log(`✓ Master dataset создан: ${masterDatasetPath} (${enrichedData.length} вариантов)`);
  
  // 5. Создание отчета
  const reportPath = path.join(REPORTS_DIR, "run_report.md");
  let report = `# Legacy Migration Report\n\n`;
  report += `**Дата:** ${new Date().toISOString()}\n\n`;
  report += `## Статистика\n\n`;
  report += `- Всего вариантов: ${variantDirs.length}\n`;
  report += `- Успешно обработано: ${enrichedData.length}\n\n`;
  report += `## Результаты анализа\n\n`;
  report += `- JSON: \`variants_features.json\`\n`;
  report += `- CSV: \`variants_features.csv\`\n`;
  
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(`✓ Отчет создан: ${reportPath}`);
  
  console.log("\n✅ Миграция завершена успешно!");
  console.log(`\nСледующие шаги:`);
  console.log(`  1. Проверьте результаты в ${REPORTS_DIR}`);
  console.log(`  2. Проверьте master dataset в ${masterDatasetPath}`);
  console.log(`  3. Новые прогоны используйте через: npm run ingest -- runs/YYYY-MM-DD_HH`);
}

main().catch((error) => {
  console.error(`\n❌ Критическая ошибка: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

