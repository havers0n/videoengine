import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind } from "ts-morph";
import { stringify } from "csv-stringify/sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VARIANTS_ROOT = process.argv[2] ?? "."; // по умолчанию текущая директория
const ONLY_VARIANT = process.argv[3] ?? null; // имя папки варианта (опционально)
const OUT_CSV = process.argv[4] ?? "variants_features.csv";
const OUT_JSON = process.argv[5] ?? "variants_features.json";

/**
 * Правило: один вариант = одна подпапка внутри VARIANTS_ROOT
 * Внутри: ts/tsx файлы (App.tsx, components/*.tsx, utils/*.ts...)
 */

function loadIgnoreList() {
  const ignorePath = path.join(__dirname, "VARIANTS_IGNORE.json");
  if (fs.existsSync(ignorePath)) {
    try {
      const config = JSON.parse(fs.readFileSync(ignorePath, "utf8"));
      return new Set(config.variants || []);
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  return new Set();
}

function listVariantDirs(root) {
  const abs = path.resolve(root);
  if (!fs.existsSync(abs)) throw new Error(`Folder not found: ${abs}`);
  const ignoreList = loadIgnoreList();
  
  let dirs = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "scripts" && d.name !== "node_modules")
    .map((d) => path.join(abs, d.name))
    .filter((d) => {
      const variantName = path.basename(d);
      return !ignoreList.has(variantName);
    });

  if (ONLY_VARIANT) {
    dirs = dirs.filter((p) => path.basename(p) === ONLY_VARIANT);
  }

  return dirs;
}

function boolOr(a, b) {
  return Boolean(a) || Boolean(b);
}

function toRelFile(dirAbs, fileAbs) {
  return path.relative(dirAbs, fileAbs).replaceAll("\\", "/");
}

function posToLine1(fullText, pos) {
  // 1-based
  return fullText.slice(0, Math.max(0, pos)).split("\n").length;
}

function snippetAround(fullText, line1, radius = 3) {
  const lines = fullText.split("\n");
  const i = line1 - 1;
  const a = Math.max(0, i - radius);
  const b = Math.min(lines.length, i + radius + 1);
  return lines.slice(a, b).join("\n");
}

function recordEvent(row, ev) {
  // дедуп по feature+file+line
  const key = `${ev.feature}::${ev.file}::${ev.line}`;
  if (!row.__event_keys) row.__event_keys = new Set();
  if (row.__event_keys.has(key)) return;
  row.__event_keys.add(key);
  row.feature_events.push(ev);
}

function markFeature(row, featureKey, value = true) {
  if (value === true) row[featureKey] = true;
}

function detectByRegex({ row, variant, dirAbs, fileRel, fullText }, feature, regex, matchLabel) {
  const re = regex.global ? regex : new RegExp(regex.source, regex.flags + "g");
  let m;
  while ((m = re.exec(fullText))) {
    markFeature(row, feature, true);

    const line = posToLine1(fullText, m.index);
    recordEvent(row, {
      variant,
      feature,
      file: fileRel,
      line,
      match: matchLabel ?? m[0],
      snippet: snippetAround(fullText, line, 3),
      kind: "regex",
    });

    // обычно достаточно 1-2 срабатываний на фичу на файл
    break;
  }
}

// Вспомогательная функция для простых regex-детекций с логированием событий
function detectSimple({ row, variant, dirAbs, fileRel, fullText }, feature, regex, matchLabel) {
  const matches = fullText.match(regex);
  if (matches) {
    markFeature(row, feature, true);
    // Находим первое вхождение для логирования (recordEvent сам делает дедупликацию по feature+file+line)
    const index = fullText.search(regex);
    if (index !== -1) {
      const line = posToLine1(fullText, index);
      recordEvent(row, {
        variant,
        feature,
        file: fileRel,
        line,
        match: matchLabel ?? matches[0],
        snippet: snippetAround(fullText, line, 3),
        kind: "regex",
      });
    }
  }
}

function initFeatureRow(variantName) {
  return {
    variant: variantName,
    feature_events: [],

    // ARCH
    has_raf: false,
    has_cancel_raf: false,
    has_canvas_2d: false,
    has_resize: false,
    has_stateRef: false,
    setState_in_raf: false, // анти-паттерн
    has_dom_overlay_text: false, // DOM текст поверх канваса

    // INTEGRATOR / TIMESTEP
    has_fixed_timestep: false,
    uses_performance_now: false,
    uses_date_now: false, // Date.now() vs performance.now()
    uses_ts_from_raf: false, // timestamp из RAF callback
    has_loop_mod: false,
    has_deterministic_rng: false,

    // FORCES
    force_spring: false,
    force_attract_to_center: false,
    force_repulse: false,
    force_noise_jitter: false,
    force_damping_mul: false,
    force_velocity_clamp: false,

    // RENDER PASSES
    pass_threads: false,
    pass_particles: false,
    pass_hotspot_gradient: false,
    pass_trails_alpha: false,

    // CURVES
    has_lerp: false,
    has_smoothstep: false,
    has_easing_words: false,

    // SEMANTIC ANCHORS
    has_clusters: false,
    has_threads: false,
    has_hotspots: false,
    has_scan_ring: false,
    has_stress_pulse: false,

    // RENDER
    has_shadow_blur: false,
    has_trails: false,
    has_gradients: false,

    // COLORS (грубые индикаторы)
    has_teal: false,
    has_red: false,

    // CONSTANTS
    particle_count: null,
    cluster_count: null,
    duration_ms: null,

    // SIGNATURE & SCORE (заполняются после анализа)
    signature: null,
    score: null,
    ENGINE_CLASS: null, // STABLE | SEMI | CHAOTIC

    files_analyzed: 0,
  };
}

function extractNumericConst(sf, names) {
  // ищем const NAME = 123;
  const vars = sf.getVariableStatements();
  for (const vs of vars) {
    for (const decl of vs.getDeclarations()) {
      const n = decl.getName();
      if (!names.includes(n)) continue;
      const init = decl.getInitializer();
      if (!init) continue;
      const text = init.getText();
      const m = text.match(/^\d+$/);
      if (m) return { name: n, value: Number(text) };
    }
  }
  return null;
}

function hasIdentifierText(sf, rx) {
  return rx.test(sf.getFullText());
}

function analyzeSourceFile(sf, row, dirAbs) {
  row.files_analyzed += 1;

  const fileAbs = sf.getFilePath();
  const fileRel = toRelFile(dirAbs, fileAbs);
  const full = sf.getFullText();
  const variant = row.variant;

  // QUICK TEXT HEURISTICS (cheap & reliable enough) - теперь с логированием событий
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_lerp", /\blerp\b/, "lerp function");
  // Inline lerp паттерн: a + (b - a) * t
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_lerp", /\w+\s*\+\s*\(\s*\w+\s*-\s*\w+\s*\)\s*\*\s*\w+/, "inline lerp pattern");
  
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_smoothstep", /\bsmoothstep\b|\bsmoothStep\b/i, "smoothstep function");
  // Inline smoothstep паттерн: t * t * (3 - 2 * t) или похожие
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_smoothstep", /\w+\s*\*\s*\w+\s*\*\s*\(\s*3\s*-\s*2\s*\*\s*\w+\s*\)/, "inline smoothstep pattern");
  
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_easing_words", /\bease(In|Out)?\b|\beasing\b/i, "easing function");

  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_shadow_blur", /\bshadowBlur\b/, "shadowBlur");
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_gradients", /\bcreateRadialGradient\b|\bcreateLinearGradient\b/, "gradient creation");
  
  // has_trails через rgba fillStyle
  if (/fillStyle\s*=\s*['"`]rgba\(/.test(full) && /\bfillRect\b/.test(full) && !row.has_trails) {
    markFeature(row, "has_trails", true);
    const index = full.search(/fillStyle\s*=\s*['"`]rgba\(/);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "has_trails",
        file: fileRel,
        line,
        match: "rgba fillStyle + fillRect",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
    }
  }

  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_teal", /teal|cyan|#2dd4bf|#06b6d4|stableGlow/i, "teal/cyan color");
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_red", /risk|red|#f87171|#ef4444|riskGlow/i, "red color");

  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_clusters", /\bCLUSTER_COUNT\b|\bclusters?\b/i, "clusters");
  
  // has_threads: lineTo + threshold/connect/distSq/correlation
  if (/\blineTo\b/.test(full) && /(distSq|threshold|connect|correlation)/i.test(full) && !row.has_threads) {
    markFeature(row, "has_threads", true);
    const index = full.search(/\blineTo\b/);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "has_threads",
        file: fileRel,
        line,
        match: "lineTo + connection logic",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
    }
  }
  
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_hotspots", /hotspot|risk\s*zone|createRadialGradient/i, "hotspots");
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_scan_ring", /scan.*ring|ring.*scan|scanner/i, "scan ring");
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_stress_pulse", /stress.*pulse|pulse.*stress|\bpulse\b/i, "stress pulse");

  // has_resize с логированием
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_resize", /ResizeObserver|addEventListener\(\s*['"]resize/i, "resize handler");

  // === REGEX DETECTORS (passes and forces) ===
  // pass_threads: lineTo + threshold/connect/distSq/correlation
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "pass_threads",
    /\blineTo\b[\s\S]{0,200}\b(distSq|threshold|connect|correlation)\b/i,
    "lineTo + (distSq|threshold|connect)"
  );

  // pass_particles: arc/fillRect usage in a loop-like context (упрощённо)
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "pass_particles",
    /\b(beginPath|arc|fillRect)\b[\s\S]{0,120}\b(fill|stroke)\b/i,
    "draw particles primitives"
  );
  
  // pass_particles для геометрических сцен: drawList/items/entities/cubes + forEach(...draw...)
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "pass_particles",
    /\b(drawList|items|entities|cubes)\s*\.\s*forEach\s*\([^)]*\b(draw|render)\b/i,
    "geometric entities forEach(draw)"
  );

  // pass_trails_alpha: rgba with alpha < 1 + fillRect clear
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "pass_trails_alpha",
    /fillStyle\s*=\s*['"`]rgba\([^)]*,\s*0\.\d+\)\s*['"`][\s\S]{0,120}\bfillRect\b/i,
    "rgba(alpha<1) + fillRect"
  );
  
  // pass_trails_alpha через globalAlpha
  if (/\bglobalAlpha\b\s*=\s*0\.\d+/.test(full) && /\bfillRect\b/.test(full) && !row.pass_trails_alpha) {
    markFeature(row, "pass_trails_alpha", true);
    markFeature(row, "has_trails", true);
    const index = full.search(/\bglobalAlpha\b\s*=\s*0\.\d+/);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "pass_trails_alpha",
        file: fileRel,
        line,
        match: "globalAlpha + fillRect",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
      recordEvent(row, {
        variant,
        feature: "has_trails",
        file: fileRel,
        line,
        match: "globalAlpha trails",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
    }
  }

  // pass_hotspot_gradient: createRadialGradient + (fillRect|arc|fill)
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "pass_hotspot_gradient",
    /createRadialGradient\s*\([\s\S]{0,300}\b(fillRect|arc|fill)\b/i,
    "createRadialGradient + fill"
  );

  // force_spring: v += dx*k OR vx += dx*k
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "force_spring",
    /\b(vx|vy|v)\s*\+=\s*(dx|dy)\s*\*\s*[a-zA-Z_]\w*/i,
    "v += d*k"
  );

  // force_damping_mul: v *= friction/damping
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "force_damping_mul",
    /\b(vx|vy|v)\s*\*=\s*(friction|damping|drag|decay|damp)\w*/i,
    "v *= damping"
  );

  // force_noise_jitter: v += rand(...) or randomRange(-a,a)
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "force_noise_jitter",
    /\b(vx|vy|v)\s*\+=\s*(randomRange|rand|Math\.random)\b/i,
    "v += random"
  );

  // force_velocity_clamp: clamp on vx/vy magnitude
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "force_velocity_clamp",
    /\b(Math\.min|Math\.max|clamp)\b[\s\S]{0,200}\b(vx|vy)\b/i,
    "clamp velocity"
  );
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_stateRef", /\bstateRef\b/, "stateRef");

  // DOM overlay text (очень грубо, но ловит)
  if (/(displayText|textOpacity|statusText)/i.test(full) && /(absolute|fixed)/i.test(full) && !row.has_dom_overlay_text) {
    markFeature(row, "has_dom_overlay_text", true);
    const index = full.search(/(displayText|textOpacity|statusText)/i);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "has_dom_overlay_text",
        file: fileRel,
        line,
        match: "DOM overlay text",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
    }
  }

  // === INTEGRATOR / TIMESTEP ===
  // uses_performance_now детектируется строго через AST выше, regex не нужен
  
  // uses_ts_from_raf: timestamp из RAF callback (timestamp: number) => { ... }
  // Ищем функции с параметром timestamp внутри RAF callback
  if (/\brequestAnimationFrame\b/.test(full)) {
    // Ищем паттерн: (timestamp) => или function(timestamp) или (timestamp: number)
    const tsPattern = /\b(timestamp|ts|time)\s*(:?\s*number)?\s*\)\s*=>|function\s*\(\s*(timestamp|ts|time)/;
    if (tsPattern.test(full) && !row.uses_ts_from_raf) {
      markFeature(row, "uses_ts_from_raf", true);
      const index = full.search(tsPattern);
      if (index !== -1) {
        const line = posToLine1(full, index);
        recordEvent(row, {
          variant,
          feature: "uses_ts_from_raf",
          file: fileRel,
          line,
          match: "timestamp from RAF callback",
          snippet: snippetAround(full, line, 5),
          kind: "regex",
        });
      }
    }
    // Также проверяем использование timestamp в вычислениях типа elapsed = timestamp - startTime
    if (/\b(elapsed|delta|dt)\s*=\s*(timestamp|ts)/.test(full) && !row.uses_ts_from_raf) {
      markFeature(row, "uses_ts_from_raf", true);
      const index = full.search(/\b(elapsed|delta|dt)\s*=\s*(timestamp|ts)/);
      if (index !== -1) {
        const line = posToLine1(full, index);
        recordEvent(row, {
          variant,
          feature: "uses_ts_from_raf",
          file: fileRel,
          line,
          match: "timestamp usage in calculations",
          snippet: snippetAround(full, line, 5),
          kind: "regex",
        });
      }
    }
  }

  // has_fixed_timestep: accumulator + while loop + fixedDt (надёжный паттерн)
  // Поддерживает как простые переменные, так и ref.current.accumulator
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_fixed_timestep",
    /\b(\w+\.(current|ref)?\.)?(acc|accum|accumulator)\w*\s*\+=\s*(delta|dt|dtReal)\w*[\s\S]{0,300}\bwhile\s*\(\s*(\w+\.(current|ref)?\.)?\w*\s*>=\s*(FIXED_DT|fixedDt|fixedTimeStep|dt|STEP_SIZE)\w*\s*\)[\s\S]{0,200}\b(step|update|tick)\s*\(/i,
    "accumulator += dt + while(acc>=dt) + step()"
  );

  // has_fixed_timestep: accumulator + for loop с уменьшением (for (; acc>=dt; acc-=dt))
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_fixed_timestep",
    /\b(\w+\.(current|ref)?\.)?(acc|accum|accumulator)\w*\s*\+=\s*(delta|dt|dtReal)\w*[\s\S]{0,300}\bfor\s*\(\s*;\s*(\w+\.(current|ref)?\.)?\w+\s*>=\s*(dt|fixedDt|FIXED_DT|fixedTimeStep|STEP_SIZE)\w*\s*;\s*\w+\s*-=\s*(dt|fixedDt|FIXED_DT|fixedTimeStep|STEP_SIZE)\w*\s*\)[\s\S]{0,200}\b(step|update|tick)\s*\(/i,
    "accumulator += dt + for(; acc>=dt; acc-=dt) + step()"
  );

  // has_fixed_timestep: last = now; dt = now - last (вычисление dt из разницы времени)
  // Это часто используется перед fixed timestep интеграцией
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_fixed_timestep",
    /\b(last|lastTime|prevTime)\w*\s*=\s*(now|currentTime|time)\w*[\s\S]{0,150}\b(dt|delta|deltaTime)\w*\s*=\s*(now|currentTime|time)\w*\s*-\s*(last|lastTime|prevTime)\w*/i,
    "last = now; dt = now - last"
  );

  // has_fixed_timestep: while loop с accumulator и step функцией
  // Паттерн: while (accumulator >= FIXED_DT) { step(FIXED_DT); accumulator -= FIXED_DT }
  // Поддерживает ref.current.accumulator и другие варианты
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_fixed_timestep",
    /\bwhile\s*\(\s*(\w+\.(current|ref)?\.)?(acc|accum|accumulator|timeAccum)\w*\s*>=\s*(FIXED_DT|fixedDt|fixedTimeStep|dt|STEP_SIZE)\w*\s*\)\s*\{[\s\S]{0,400}\b(step|update|tick|integrate|simulate)\s*\([\s\S]{0,400}\b(\w+\.(current|ref)?\.)?\w+\s*-=\s*\w+/i,
    "while(acc>=dt) { step(dt); acc -= dt }"
  );

  // has_fixed_timestep: fixed dt constant (расширенный паттерн)
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_fixed_timestep",
    /\b(const|let|var)\s+(FIXED_DT|fixedDt|FIXED_TIME_STEP|fixedTimeStep|STEP_SIZE)\w*\s*=\s*(1000\s*\/\s*60|16\.6|16\.666|1\s*\/\s*60|0\.016)/i,
    "fixed dt constant"
  );

  // has_fixed_timestep: accumulator паттерн с более гибким именованием
  // Ищем accumulator += dt рядом с while/for loop и step функцией
  // Поддерживает ref.current и другие варианты доступа
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_fixed_timestep",
    /\b(\w+\.(current|ref)?\.)?(acc|accum|accumulator|timeAccum|timeAccumulator)\w*\s*\+=\s*(delta|dt|deltaTime|deltaT|dtReal)\w*[\s\S]{0,350}\b(while|for)\s*\([\s\S]{0,200}\b(step|update|tick|integrate|simulate)\s*\(/i,
    "accumulator += dt + loop + step"
  );

  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_loop_mod", /%\s*ANIMATION_DURATION|elapsed\s*%/i, "loop modulo");

  // has_deterministic_rng: seed-based или кастомный PRNG
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_deterministic_rng",
    /\b(seed|seeded|seedrandom|mulberry32|xoshiro|lcg|prng|pseudo.*random)\w*\s*[=:]/i,
    "seed-based or custom PRNG"
  );

  // has_deterministic_rng: класс PRNG или функция с seed
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_deterministic_rng",
    /\b(seed|prng)\w*\s*\([\s\S]{0,100}(seed|state)\w*\s*[=:)]/i,
    "PRNG constructor with seed"
  );

  // === FORCES === (детекторы уже есть через detectByRegex выше, эти дубликаты для полноты)
  if (/\b[vV][xy]\s*\*=\s*(friction|damping|\d\.\d+)/.test(full) && !row.force_damping_mul) {
    markFeature(row, "force_damping_mul", true);
  }
  if (/\b[vV][xy]\s*\+=\s*d[xy]\s*\*\s*\w+/i.test(full) && !row.force_spring) {
    markFeature(row, "force_spring", true);
  }
  if (/\b[vV][xy]\s*\+=\s*(randomRange|Math\.random)/.test(full) && !row.force_noise_jitter) {
    markFeature(row, "force_noise_jitter", true);
  }
  if ((/\bclamp\(|Math\.min\(|Math\.max\(/.test(full) && /vx|vy/.test(full)) && !row.force_velocity_clamp) {
    markFeature(row, "force_velocity_clamp", true);
  }
  if ((/(repel|repulsion)/i.test(full) || /dx\s*=.*-.*\n.*vx\s*-=/.test(full)) && !row.force_repulse) {
    markFeature(row, "force_repulse", true);
  }
  if ((/(attract|center|gravity)/i.test(full) && /vx|vy/.test(full)) && !row.force_attract_to_center) {
    markFeature(row, "force_attract_to_center", true);
  }

  // === RENDER PASSES === (детекторы уже есть через detectByRegex выше, эти дубликаты для полноты)
  if (/\bstroke\b/.test(full) && /\blineTo\b/.test(full) && /(distSq|threshold|connect)/i.test(full) && !row.pass_threads) {
    markFeature(row, "pass_threads", true);
  }
  if (/\barc\b/.test(full) && /\bfill\b/.test(full) && !row.pass_particles) {
    markFeature(row, "pass_particles", true);
  }
  if (/\bcreateRadialGradient\b/.test(full) && /(hotspot|risk|zone)/i.test(full) && !row.pass_hotspot_gradient) {
    markFeature(row, "pass_hotspot_gradient", true);
  }
  if (/fillStyle\s*=\s*['"`]rgba\(/.test(full) && /\bfillRect\b/.test(full) && /alpha|opacity/i.test(full) && !row.pass_trails_alpha) {
    markFeature(row, "pass_trails_alpha", true);
    markFeature(row, "has_trails", true);
  }

  // === AST PART (точно) ===
  // 1) detect canvas 2d usage
  const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const c of calls) {
    const exprText = c.getExpression().getText();

    if (exprText.includes("requestAnimationFrame")) {
      row.has_raf = true;
      const pos = c.getStart();
      const line = posToLine1(full, pos);
      recordEvent(row, {
        variant,
        feature: "has_raf",
        file: fileRel,
        line,
        match: "requestAnimationFrame",
        snippet: snippetAround(full, line),
        kind: "ast",
      });
    }

    if (exprText.includes("cancelAnimationFrame")) {
      row.has_cancel_raf = true;
      const pos = c.getStart();
      const line = posToLine1(full, pos);
      recordEvent(row, {
        variant,
        feature: "has_cancel_raf",
        file: fileRel,
        line,
        match: "cancelAnimationFrame",
        snippet: snippetAround(full, line),
        kind: "ast",
      });
    }

    // getContext("2d")
    if (exprText.endsWith("getContext") && c.getArguments().length) {
      const a0 = c.getArguments()[0].getText();
      if (a0 === "'2d'" || a0 === '"2d"') {
        row.has_canvas_2d = true;
        const pos = c.getStart();
        const line = posToLine1(full, pos);
        recordEvent(row, {
          variant,
          feature: "has_canvas_2d",
          file: fileRel,
          line,
          match: "getContext('2d')",
          snippet: snippetAround(full, line),
          kind: "ast",
        });
      }
    }

    // performance.now() - строгая проверка call expression
    // Проверяем точное совпадение или окончание на .performance.now (для window.performance.now())
    if (exprText === "performance.now" || exprText.endsWith(".performance.now")) {
      row.uses_performance_now = true;
      const pos = c.getStart();
      const line = posToLine1(full, pos);
      recordEvent(row, {
        variant,
        feature: "uses_performance_now",
        file: fileRel,
        line,
        match: "performance.now()",
        snippet: snippetAround(full, line),
        kind: "ast",
      });
    }

    // Date.now() - детекция отдельно от performance.now()
    if (exprText === "Date.now" || exprText.endsWith(".Date.now")) {
      row.uses_date_now = true;
      const pos = c.getStart();
      const line = posToLine1(full, pos);
      recordEvent(row, {
        variant,
        feature: "uses_date_now",
        file: fileRel,
        line,
        match: "Date.now()",
        snippet: snippetAround(full, line),
        kind: "ast",
      });
    }
  }

  // 2) setState inside raf/animate (анти-паттерн)
  // эвристика: если внутри функции animate (по имени) или callback RAF есть вызовы setX(...)
  const funcs = sf.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
  const arrowFuncs = sf.getDescendantsOfKind(SyntaxKind.ArrowFunction);

  const functionBodies = [];

  for (const f of funcs) {
    const name = f.getName() ?? "";
    if (/animate/i.test(name)) functionBodies.push(f.getBody()?.getText() ?? "");
  }

  for (const af of arrowFuncs) {
    const t = af.getText();
    if (/animate/i.test(t.slice(0, 80))) functionBodies.push(af.getBody().getText());
  }

  // callback RAF: requestAnimationFrame((ts)=>{...})
  for (const c of calls) {
    const exprText = c.getExpression().getText();
    if (!exprText.includes("requestAnimationFrame")) continue;
    const args = c.getArguments();
    if (!args.length) continue;
    const cb = args[0].getText();
    functionBodies.push(cb);
  }

  for (const body of functionBodies) {
    if (/\bset[A-Z]\w*\s*\(/.test(body) || /\bsetState\s*\(/.test(body)) {
      row.setState_in_raf = true;
      break;
    }
  }

  // 3) pull numeric constants if present
  const p = extractNumericConst(sf, ["PARTICLE_COUNT", "particleCount"]);
  if (p && row.particle_count == null) row.particle_count = p.value;

  const cc = extractNumericConst(sf, ["CLUSTER_COUNT", "clusterCount"]);
  if (cc && row.cluster_count == null) row.cluster_count = cc.value;

  const d = extractNumericConst(sf, ["ANIMATION_DURATION", "DURATION_MS", "TOTAL_DURATION"]);
  if (d && row.duration_ms == null) row.duration_ms = d.value;
}

function mergeRowsAgg(rows) {
  // rows: один variant может иметь несколько файлов
  // мы уже агрегируем по OR в row, поэтому просто возвращаем row
  return rows;
}

function normalizeDuration(row) {
  // Нормализация duration: если значение <= 60, считаем что это секунды
  if (row.duration_ms != null && row.duration_ms > 0 && row.duration_ms <= 60) {
    row.duration_ms *= 1000; // seconds -> ms
  }
  // Дефолт если не указано
  if (row.duration_ms == null) {
    row.duration_ms = 18000; // дефолт 18s
  }
}

function generateSignature(row) {
  // Формируем строковую сигнатуру варианта для кластеризации
  return [
    row.has_clusters ? "C" : "-",
    row.has_threads ? "T" : "-",
    row.has_hotspots ? "H" : "-",
    row.has_trails ? "TR" : "-",
    row.has_shadow_blur ? "GB" : "-",
    row.force_spring ? "SP" : "-",
    row.force_damping_mul ? "DM" : "-",
    row.force_noise_jitter ? "NJ" : "-",
    row.setState_in_raf ? "BAD" : "OK",
  ].join("_");
}

function classifyEngineClass(row) {
  // STABLE: композиция стабильных признаков + нет setState в RAF
  // uses_performance_now || has_fixed_timestep || has_deterministic_rng || has_stateRef
  const hasStabilityFeature = row.uses_performance_now || 
                               row.has_fixed_timestep || 
                               row.has_deterministic_rng || 
                               row.has_stateRef;
  
  if (hasStabilityFeature && !row.setState_in_raf) {
    return "STABLE";
  }
  // SEMI: использует performance.now или timestamp из RAF, но не полностью стабильный
  if (row.uses_performance_now || row.uses_ts_from_raf) {
    return "SEMI";
  }
  // CHAOTIC: всё остальное
  return "CHAOTIC";
}

function score(row) {
  let s = 0;
  
  // Базовые требования
  if (row.has_canvas_2d) s += 2;
  if (row.has_raf) s += 2;
  if (!row.setState_in_raf) s += 3; else s -= 5;

  // Guardfolio semantics
  if (row.has_threads) s += 2;
  if (row.has_clusters) s += 2;
  if (row.has_hotspots) s += 1;

  // Premium look
  if (row.has_trails) s += 2;
  if (row.has_shadow_blur) s += 2;
  if (row.has_gradients) s += 1;

  // Stability physics
  if (row.force_spring) s += 2;
  if (row.force_damping_mul) s += 2;
  if (row.force_noise_jitter) s += 1;

  // Resize = production ready
  if (row.has_resize) s += 1;

  // Cancel RAF = cleanup
  if (row.has_cancel_raf) s += 1;

  // Fixed timestep = stability
  if (row.has_fixed_timestep) s += 1;

  return s;
}

function printTop(df) {
  if (!df || df.length === 0) {
    console.log("\n=== No data to display ===");
    return;
  }
  const boolKeys = Object.keys(df[0]).filter(
    (k) => 
      k.startsWith("has_") || 
      k.endsWith("_raf") || 
      k.startsWith("setState") ||
      k.startsWith("force_") ||
      k.startsWith("pass_") ||
      k.startsWith("uses_")
  );

  const freq = boolKeys.map((k) => {
    const count = df.reduce((acc, r) => acc + (r[k] ? 1 : 0), 0);
    return { key: k, count, pct: (count / df.length) * 100 };
  });

  freq.sort((a, b) => b.count - a.count);

  console.log("\n=== TOP FEATURES ===");
  for (const f of freq.slice(0, 20)) {
    console.log(`${f.key.padEnd(28)} ${String(f.count).padStart(3)}  (${f.pct.toFixed(1)}%)`);
  }

  console.log("\n=== ANTI-PATTERN (setState_in_raf) ===");
  const bad = df.filter((r) => r.setState_in_raf).map((r) => r.variant);
  console.log(bad.length ? bad.join(", ") : "none");

  console.log("\n=== SIGNATURE CLUSTERS ===");
  const sigFreq = {};
  for (const r of df) {
    sigFreq[r.signature] = (sigFreq[r.signature] || 0) + 1;
  }
  const sigSorted = Object.entries(sigFreq)
    .map(([sig, count]) => ({ sig, count }))
    .sort((a, b) => b.count - a.count);
  for (const s of sigSorted.slice(0, 10)) {
    const examples = df.filter((r) => r.signature === s.sig).slice(0, 3).map((r) => r.variant);
    console.log(`${s.sig.padEnd(30)} ${String(s.count).padStart(2)}x  (${examples.join(", ")})`);
  }

  console.log("\n=== TOP-5 ENGINE CANDIDATES (by score) ===");
  const scored = df
    .map((r) => ({ variant: r.variant, score: r.score, signature: r.signature }))
    .sort((a, b) => b.score - a.score);
  for (const s of scored.slice(0, 5)) {
    console.log(`${s.variant.padEnd(40)} score: ${String(s.score).padStart(3)}  [${s.signature}]`);
  }

  console.log("\n=== LIKELY PREMIUM (clusters+threads+hotspots+shadowBlur, NO setState_in_raf) ===");
  const premium = df.filter(
    (r) => r.has_clusters && r.has_threads && r.has_hotspots && r.has_shadow_blur && !r.setState_in_raf
  );
  console.log(premium.length ? premium.map((r) => `${r.variant} (score: ${r.score})`).join(", ") : "none");
}

async function main() {
  const variantDirs = listVariantDirs(VARIANTS_ROOT);
  console.log(`Found variants: ${variantDirs.length} in ${VARIANTS_ROOT}`);

  const results = [];

  for (const dir of variantDirs) {
    const variantName = path.basename(dir);
    const row = initFeatureRow(variantName);

    // Приоритетный набор влияющих файлов (сужаем анализ)
    const patterns = [
      "App.tsx",
      "components/**/*.{ts,tsx}",
      "constants.ts",
      "utils/**/*.{ts,tsx}",
      "!**/node_modules/**",
      "!**/dist/**",
      "!**/.next/**",
      "!**/build/**",
    ];
    const files = await fg(patterns, { cwd: dir, absolute: true });

    if (files.length === 0) {
      console.log(`  ⚠️  ${variantName}: no TS/TSX files found, skipping`);
      continue;
    }

    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { allowJs: false, jsx: 2 },
      skipAddingFilesFromTsConfig: true,
    });

    for (const f of files) {
      try {
        const text = fs.readFileSync(f, "utf8");
        project.createSourceFile(f, text, { overwrite: true });
      } catch (err) {
        console.warn(`  ⚠️  ${variantName}: failed to read ${f}: ${err.message}`);
      }
    }

    for (const sf of project.getSourceFiles()) {
      try {
        analyzeSourceFile(sf, row, dir);
      } catch (err) {
        console.warn(`  ⚠️  ${variantName}: failed to analyze ${sf.getFilePath()}: ${err.message}`);
      }
    }

    // Нормализация duration
    normalizeDuration(row);

    // Генерация сигнатуры, scoring и классификация
    row.signature = generateSignature(row);
    row.score = score(row);
    row.ENGINE_CLASS = classifyEngineClass(row);

    results.push(row);
    console.log(`  ✓ ${variantName}: ${row.files_analyzed} files, score: ${row.score}`);

    // Сохранение отдельных файлов для одного варианта
    if (ONLY_VARIANT) {
      fs.writeFileSync(`${ONLY_VARIANT}.json`, JSON.stringify(row, null, 2), "utf8");
      fs.writeFileSync(`${ONLY_VARIANT}.csv`, stringify([row], { header: true }), "utf8");
    }
  }

  // save
  for (const r of results) delete r.__event_keys;
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2), "utf8");
  fs.writeFileSync(OUT_CSV, stringify(results, { header: true }), "utf8");

  console.log(`\nSaved: ${OUT_JSON}`);
  console.log(`Saved: ${OUT_CSV}`);

  printTop(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

