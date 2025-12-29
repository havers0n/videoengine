import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import AdmZip from "adm-zip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

/**
 * Скрипт ингеста для автоматической обработки zip-файлов и промптов
 * 
 * Использование:
 *   npm run ingest -- runs/2025-12-29_01
 * 
 * Процесс:
 *   1. Читает runs/.../zips/*.zip
 *   2. Распаковывает в runs/.../extracted/<zipname>/
 *   3. Нормализует в runs/.../variants/<variant_name>/
 *   4. Копирует prompt_id (или сохраняет mapping zip → prompt)
 *   5. Запускает analyze по runs/.../variants
 *   6. Пишет runs/.../reports/*
 *   7. (опционально) Добавляет результаты в /master/dataset.json
 */

const RUN_DIR = process.argv[2];

if (!RUN_DIR) {
  console.error("❌ Укажите директорию run:");
  console.error("   npm run ingest -- runs/2025-12-29_01");
  process.exit(1);
}

const runPath = path.resolve(PROJECT_ROOT, RUN_DIR);
const zipsDir = path.join(runPath, "zips");
const extractedDir = path.join(runPath, "extracted");
const variantsDir = path.join(runPath, "variants");
const reportsDir = path.join(runPath, "reports");

// Проверка существования директории run
if (!fs.existsSync(runPath)) {
  console.error(`❌ Директория не найдена: ${runPath}`);
  process.exit(1);
}

// Создание необходимых директорий
[zipsDir, extractedDir, variantsDir, reportsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Создана директория: ${dir}`);
  }
});

/**
 * Нормализация имени варианта из имени zip-файла
 */
function normalizeVariantName(zipName) {
  // Убираем расширение .zip
  let name = zipName.replace(/\.zip$/i, "");
  // Убираем пробелы и спецсимволы, заменяем на дефисы
  name = name.replace(/[^a-zA-Z0-9-_]/g, "-");
  // Убираем множественные дефисы
  name = name.replace(/-+/g, "-");
  // Убираем дефисы в начале и конце
  name = name.replace(/^-+|-+$/g, "");
  return name || "unnamed-variant";
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
 * Нормализация структуры варианта
 * Копирует файлы в стандартную структуру variants/<variant_name>/
 */
function normalizeVariant(extractedPath, variantName) {
  const variantPath = path.join(variantsDir, variantName);
  
  // Если вариант уже нормализован, пропускаем
  if (fs.existsSync(variantPath)) {
    console.log(`  ⚠️  Вариант ${variantName} уже существует, пропускаем`);
    return variantPath;
  }
  
  fs.mkdirSync(variantPath, { recursive: true });
  
  // Ищем ключевой файл для определения структуры
  const keyFile = findKeyFiles(extractedPath);
  
  if (!keyFile) {
    // Если ключевого файла нет, копируем всё содержимое
    console.log(`  ⚠️  Ключевой файл не найден, копируем всё содержимое`);
    copyDirectory(extractedPath, variantPath);
  } else {
    // Определяем корень проекта (может быть в подпапке)
    const keyFileDir = path.dirname(keyFile);
    const projectRoot = keyFileDir === "." ? extractedPath : path.join(extractedPath, keyFileDir);
    
    // Копируем содержимое корня проекта
    copyDirectory(projectRoot, variantPath);
  }
  
  return variantPath;
}

/**
 * Рекурсивное копирование директории с фильтрацией мусора
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
 * Чтение промптов из файлов prompt_*.txt
 */
function readPrompts() {
  const prompts = {};
  const promptFiles = fs.readdirSync(runPath)
    .filter(f => f.startsWith("prompt_") && f.endsWith(".txt"))
    .sort();
  
  for (const file of promptFiles) {
    const promptId = file.replace(/^prompt_/, "").replace(/\.txt$/, "");
    const content = fs.readFileSync(path.join(runPath, file), "utf8");
    prompts[promptId] = content.trim();
  }
  
  return prompts;
}

/**
 * Создание mapping файла zip → prompt
 */
function createMapping(zipToVariant, prompts) {
  const mapping = {
    run: path.basename(runPath),
    timestamp: new Date().toISOString(),
    prompts: prompts,
    variants: zipToVariant,
  };
  
  const mappingPath = path.join(runPath, "mapping.json");
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), "utf8");
  console.log(`✓ Создан mapping: ${mappingPath}`);
  
  return mapping;
}

/**
 * Запуск анализа вариантов
 */
function runAnalysis() {
  console.log("\n=== Запуск анализа вариантов ===");
  
  const analyzeScript = path.join(PROJECT_ROOT, "data", "scripts", "analyze-variants.mjs");
  const outJson = path.join(reportsDir, "variants_features.json");
  const outCsv = path.join(reportsDir, "variants_features.csv");
  
  try {
    execSync(
      `node "${analyzeScript}" "${variantsDir}" null "${outCsv}" "${outJson}"`,
      { cwd: PROJECT_ROOT, stdio: "inherit" }
    );
    console.log(`✓ Анализ завершен`);
    return { json: outJson, csv: outCsv };
  } catch (error) {
    console.error(`❌ Ошибка при анализе: ${error.message}`);
    return null;
  }
}

/**
 * Генерация отчета по run
 */
function generateReport(analysisResults, mapping) {
  if (!analysisResults) {
    return;
  }
  
  let report = `# Отчет по run: ${mapping.run}\n\n`;
  report += `**Дата:** ${mapping.timestamp}\n\n`;
  report += `## Промпты\n\n`;
  
  for (const [promptId, content] of Object.entries(mapping.prompts)) {
    report += `### ${promptId}\n\n`;
    report += `\`\`\`\n${content}\n\`\`\`\n\n`;
  }
  
  report += `## Варианты\n\n`;
  report += `Всего обработано: ${Object.keys(mapping.variants).length}\n\n`;
  
  for (const [zip, variant] of Object.entries(mapping.variants)) {
    report += `- \`${zip}\` → \`${variant}\`\n`;
  }
  
  report += `\n## Результаты анализа\n\n`;
  report += `- JSON: \`${path.relative(runPath, analysisResults.json)}\`\n`;
  report += `- CSV: \`${path.relative(runPath, analysisResults.csv)}\`\n`;
  
  // Добавляем compliance таблицу, если есть данные
  if (fs.existsSync(analysisResults.json)) {
    try {
      const data = JSON.parse(fs.readFileSync(analysisResults.json, "utf8"));
      if (data.length > 0 && data[0].compliance) {
        report += `\n## Compliance Summary\n\n`;
        report += `| Rule | Pass | Fail | Description |\n`;
        report += `|------|------|------|-------------|\n`;
        
        const complianceStats = {};
        data.forEach(variant => {
          if (variant.compliance) {
            variant.compliance.forEach(rule => {
              if (!complianceStats[rule.name]) {
                complianceStats[rule.name] = { pass: 0, fail: 0, description: rule.description };
              }
              if (rule.pass) {
                complianceStats[rule.name].pass++;
              } else {
                complianceStats[rule.name].fail++;
              }
            });
          }
        });
        
        for (const [ruleName, stats] of Object.entries(complianceStats)) {
          const total = stats.pass + stats.fail;
          const passPct = total > 0 ? ((stats.pass / total) * 100).toFixed(1) : 0;
          report += `| ${ruleName} | ${stats.pass} (${passPct}%) | ${stats.fail} | ${stats.description} |\n`;
        }
        
        // Статистика по классам
        const classStats = {};
        data.forEach(v => {
          const cls = v.ENGINE_CLASS || "UNKNOWN";
          classStats[cls] = (classStats[cls] || 0) + 1;
        });
        
        report += `\n### Engine Classes\n\n`;
        for (const [cls, count] of Object.entries(classStats)) {
          const pct = ((count / data.length) * 100).toFixed(1);
          report += `- **${cls}**: ${count} (${pct}%)\n`;
        }
      }
    } catch (e) {
      console.warn(`⚠️  Не удалось добавить compliance таблицу: ${e.message}`);
    }
  }
  
  const reportPath = path.join(reportsDir, "run_report.md");
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(`✓ Отчет создан: ${reportPath}`);
}

/**
 * Добавление результатов в master dataset
 */
function updateMasterDataset(analysisResults) {
  if (!analysisResults || !fs.existsSync(analysisResults.json)) {
    return;
  }
  
  const masterDatasetPath = path.join(PROJECT_ROOT, "master", "dataset.json");
  const runData = JSON.parse(fs.readFileSync(analysisResults.json, "utf8"));
  
  let masterData = [];
  if (fs.existsSync(masterDatasetPath)) {
    try {
      masterData = JSON.parse(fs.readFileSync(masterDatasetPath, "utf8"));
    } catch (e) {
      console.warn(`⚠️  Не удалось прочитать master dataset, создаем новый`);
    }
  }
  
  // Добавляем run_id к каждому варианту
  const runId = path.basename(runPath);
  const enrichedData = runData.map(v => ({
    ...v,
    run_id: runId,
    ingested_at: new Date().toISOString(),
  }));
  
  // Объединяем с существующими данными (избегаем дубликатов по variant+run_id)
  const existingKeys = new Set(
    masterData.map(v => `${v.variant}::${v.run_id || 'legacy'}`)
  );
  
  const newVariants = enrichedData.filter(
    v => !existingKeys.has(`${v.variant}::${v.run_id}`)
  );
  
  masterData.push(...newVariants);
  
  fs.writeFileSync(masterDatasetPath, JSON.stringify(masterData, null, 2), "utf8");
  console.log(`✓ Master dataset обновлен: ${masterDatasetPath} (+${newVariants.length} вариантов)`);
}

async function main() {
  console.log(`\n=== Ингест run: ${runPath} ===\n`);
  
  // 1. Чтение zip-файлов
  if (!fs.existsSync(zipsDir)) {
    console.error(`❌ Директория zips не найдена: ${zipsDir}`);
    console.error(`   Создайте директорию и поместите туда zip-файлы`);
    process.exit(1);
  }
  
  const zipFiles = fs.readdirSync(zipsDir)
    .filter(f => f.toLowerCase().endsWith(".zip"))
    .map(f => path.join(zipsDir, f));
  
  if (zipFiles.length === 0) {
    console.log(`⚠️  Zip-файлы не найдены в ${zipsDir}`);
    console.log(`   Пропускаем этап распаковки`);
  } else {
    console.log(`Найдено zip-файлов: ${zipFiles.length}`);
    
    // 2. Распаковка
    const zipToVariant = {};
    
    for (const zipPath of zipFiles) {
      const zipName = path.basename(zipPath);
      const variantName = normalizeVariantName(zipName);
      const extractedPath = path.join(extractedDir, variantName);
      
      console.log(`\n📦 ${zipName} → ${variantName}`);
      
      try {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractedPath, true);
        console.log(`  ✓ Распакован в: ${extractedPath}`);
        
        // 3. Нормализация
        const normalizedPath = normalizeVariant(extractedPath, variantName);
        console.log(`  ✓ Нормализован в: ${normalizedPath}`);
        
        zipToVariant[zipName] = variantName;
      } catch (error) {
        console.error(`  ❌ Ошибка при обработке ${zipName}: ${error.message}`);
      }
    }
    
    // 4. Чтение промптов и создание mapping
    const prompts = readPrompts();
    const mapping = createMapping(zipToVariant, prompts);
    
    // 5. Запуск анализа
    const analysisResults = runAnalysis();
    
    // 6. Генерация отчета
    generateReport(analysisResults, mapping);
    
    // 7. Обновление master dataset
    updateMasterDataset(analysisResults);
    
    console.log(`\n✅ Ингест завершен успешно!`);
  }
}

main().catch((error) => {
  console.error(`\n❌ Критическая ошибка: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

