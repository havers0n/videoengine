import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind } from "ts-morph";
import { stringify } from "csv-stringify/sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VARIANTS_ROOT = process.argv[2] ?? "."; // по умолчанию текущая директория
const ONLY_VARIANT = process.argv[3] && process.argv[3] !== "null" ? process.argv[3] : null; // имя папки варианта (опционально)
const OUT_CSV = process.argv[4] ?? "variants_features.csv";
const OUT_JSON = process.argv[5] ?? "variants_features.json";

/**
 * Правило: один вариант = одна подпапка внутри VARIANTS_ROOT
 * Внутри: ts/tsx файлы (App.tsx, components/*.tsx, utils/*.ts...)
 */

function loadIgnoreList() {
  // Сначала пробуем загрузить из master/, потом из локального
  const masterIgnorePath = path.join(__dirname, "..", "..", "master", "ignore.json");
  const localIgnorePath = path.join(__dirname, "VARIANTS_IGNORE.json");
  
  for (const ignorePath of [masterIgnorePath, localIgnorePath]) {
    if (fs.existsSync(ignorePath)) {
      try {
        const config = JSON.parse(fs.readFileSync(ignorePath, "utf8"));
        return new Set(config.variants || []);
      } catch (e) {
        // Игнорируем ошибки
      }
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
    no_react_state_in_loop: true, // compliance: нет setState в RAF loop
    
    // TRACKS & TIMELINE SYSTEM
    has_tracks_system: false, // animateTrack или tracks. + keyframes {at:}
    has_timeline_file: false, // Timeline.ts или timeline файл
    has_keyframe_system: false, // keyframes с at: или value:
    has_track_sequencing: false, // последовательность треков
    
    // OVERLAY & UI
    has_overlay_component: false, // Overlay.tsx или overlay компонент
    has_dom_overlay_div: false, // div с position absolute/fixed поверх canvas
    has_ui_controls: false, // кнопки, слайдеры, UI элементы управления
    has_animation_controls: false, // play/pause/stop контролы
    has_component_separation: false, // отдельные компоненты для UI и canvas

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
    
    // COMPLIANCE DETECTION
    uses_math_random: false, // Math.random() без детерминированного RNG

    // CONSTANTS
    particle_count: null,
    cluster_count: null,
    duration_ms: null,

    // SIGNATURE & SCORE (заполняются после анализа)
    signature: null,
    score: null,
    ENGINE_CLASS: null, // STABLE | SEMI | CHAOTIC | NON_COMPLIANT | NON_DETERMINISTIC | INVALID

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

  // === TRACKS & TIMELINE SYSTEM ===
  // has_tracks_system: animateTrack или tracks. + keyframes {at:}
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_tracks_system",
    /\b(animateTrack|tracks\.)\s*\([\s\S]{0,300}\bkeyframes?\s*[:\{][\s\S]{0,200}\bat\s*:/i,
    "animateTrack or tracks. + keyframes {at:}"
  );
  
  // has_keyframe_system: keyframes с at: или value:
  detectByRegex(
    { row, variant, dirAbs, fileRel, fullText: full },
    "has_keyframe_system",
    /\bkeyframes?\s*[:\{][\s\S]{0,500}\b(at|value)\s*:/i,
    "keyframes with at: or value:"
  );
  
  // has_track_sequencing: последовательность треков (track1, track2, sequence)
  if (/\btracks?\s*[=:]\s*\[/.test(full) && /\.(push|concat|map)\s*\(/.test(full) && !row.has_track_sequencing) {
    markFeature(row, "has_track_sequencing", true);
    const index = full.search(/\btracks?\s*[=:]\s*\[/);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "has_track_sequencing",
        file: fileRel,
        line,
        match: "tracks array with sequencing",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
    }
  }

  // === OVERLAY & UI ===
  // has_overlay_component: Overlay.tsx или overlay компонент
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_overlay_component", 
    /\b(Overlay|OverlayComponent|UIOverlay)\s*[=:\(]/i, "Overlay component");
  
  // has_dom_overlay_div: div с position absolute/fixed поверх canvas
  if (/<div[\s\S]{0,200}(absolute|fixed)/i.test(full) && /(position|style)\s*[=:]/i.test(full) && !row.has_dom_overlay_div) {
    markFeature(row, "has_dom_overlay_div", true);
    const index = full.search(/<div[\s\S]{0,200}(absolute|fixed)/i);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "has_dom_overlay_div",
        file: fileRel,
        line,
        match: "div with absolute/fixed position",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
    }
  }
  
  // has_ui_controls: кнопки, слайдеры, UI элементы управления
  if (/(button|slider|input|control)/i.test(full) && /(onClick|onChange|onInput)/i.test(full) && !row.has_ui_controls) {
    markFeature(row, "has_ui_controls", true);
    const index = full.search(/(button|slider|input|control)/i);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "has_ui_controls",
        file: fileRel,
        line,
        match: "UI controls (button/slider/input)",
        snippet: snippetAround(full, line, 3),
        kind: "regex",
      });
    }
  }
  
  // has_animation_controls: play/pause/stop контролы
  detectSimple({ row, variant, dirAbs, fileRel, fullText: full }, "has_animation_controls",
    /\b(play|pause|stop|toggle)\s*[=:\(]/i, "animation controls");
  
  // has_component_separation: отдельные компоненты для UI и canvas
  if (/(Canvas|Animation|Engine)\s*[=:]/i.test(full) && /(Overlay|UI|Controls)\s*[=:]/i.test(full) && !row.has_component_separation) {
    markFeature(row, "has_component_separation", true);
    const index = full.search(/(Canvas|Animation|Engine)\s*[=:]/i);
    if (index !== -1) {
      const line = posToLine1(full, index);
      recordEvent(row, {
        variant,
        feature: "has_component_separation",
        file: fileRel,
        line,
        match: "separate Canvas/Animation and UI components",
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
    
    // Math.random() - детекция для compliance
    if (exprText === "Math.random" || exprText.endsWith(".Math.random")) {
      row.uses_math_random = true;
      const pos = c.getStart();
      const line = posToLine1(full, pos);
      recordEvent(row, {
        variant,
        feature: "uses_math_random",
        file: fileRel,
        line,
        match: "Math.random()",
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
      row.no_react_state_in_loop = false; // нарушение compliance
      break;
    }
  }
  
  // Дополнительная проверка: useState + requestAnimationFrame в одном файле
  const hasUseState = /\buseState\s*\(/.test(full);
  const hasRAF = /\brequestAnimationFrame\b/.test(full);
  if (hasUseState && hasRAF && !row.setState_in_raf) {
    // Если есть useState и RAF, но setState не найден в callback - это хорошо
    // no_react_state_in_loop уже true по умолчанию
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
  // HARD GATES (приоритетные проверки)
  
  // INVALID: setState в RAF - критическое нарушение
  if (row.setState_in_raf) {
    return "INVALID";
  }
  
  // NON_DETERMINISTIC: использует Date.now или Math.random без детерминированного RNG
  if (row.uses_date_now || (row.uses_math_random && !row.has_deterministic_rng)) {
    return "NON_DETERMINISTIC";
  }
  
  // NON_COMPLIANT: нет fixed timestep
  if (!row.has_fixed_timestep) {
    return "NON_COMPLIANT";
  }
  
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

/**
 * Генерация compliance таблицы (PASS/FAIL по каждому HARD RULE)
 */
function generateComplianceTable(row) {
  const rules = [
    {
      name: "Fixed Timestep",
      pass: row.has_fixed_timestep,
      description: "Использует фиксированный timestep для стабильной физики"
    },
    {
      name: "Deterministic RNG",
      pass: row.has_deterministic_rng,
      description: "Использует детерминированный RNG (seed-based)"
    },
    {
      name: "Performance.now",
      pass: row.uses_performance_now,
      description: "Использует performance.now() вместо Date.now()"
    },
    {
      name: "No setState in RAF",
      pass: row.no_react_state_in_loop && !row.setState_in_raf,
      description: "Нет setState внутри requestAnimationFrame"
    },
    {
      name: "DOM Overlay",
      pass: row.has_dom_overlay_div || row.has_overlay_component || row.has_dom_overlay_text,
      description: "Имеет DOM overlay поверх canvas"
    },
    {
      name: "Tracks System",
      pass: row.has_tracks_system || row.has_timeline_file,
      description: "Имеет систему треков/таймлайна"
    },
  ];
  
  return rules;
}

function loadScoringWeights() {
  // Загружаем веса из master/scoring.json
  const masterScoringPath = path.join(__dirname, "..", "..", "master", "scoring.json");
  if (fs.existsSync(masterScoringPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(masterScoringPath, "utf8"));
      return config.weights || {};
    } catch (e) {
      console.warn(`⚠️  Не удалось загрузить веса из master/scoring.json: ${e.message}`);
    }
  }
  // Fallback на дефолтные веса
  return {};
}

const SCORING_WEIGHTS = loadScoringWeights();

function score(row) {
  let s = 0;
  
  // Используем веса из master/scoring.json, если доступны
  const weights = Object.keys(SCORING_WEIGHTS).length > 0 ? SCORING_WEIGHTS : {
    has_canvas_2d: 2,
    has_raf: 2,
    setState_in_raf: -5,
    has_fixed_timestep: 1,
    has_deterministic_rng: 0,
    has_stateRef: 0,
    uses_performance_now: 0,
    uses_date_now: 0,
    has_threads: 2,
    has_clusters: 2,
    has_hotspots: 1,
    has_trails: 2,
    has_shadow_blur: 2,
    has_gradients: 1,
    force_spring: 2,
    force_damping_mul: 2,
    force_noise_jitter: 1,
    has_resize: 1,
    has_cancel_raf: 1,
  };
  
  // Применяем веса
  for (const [feature, weight] of Object.entries(weights)) {
    if (weight === 0) continue; // Пропускаем нулевые веса
    if (row[feature] === true) {
      s += weight;
    }
  }
  
  // Дополнительная логика для setState_in_raf (штраф применяется отдельно)
  if (row.setState_in_raf && weights.setState_in_raf < 0) {
    s += weights.setState_in_raf;
  } else if (!row.setState_in_raf && weights.setState_in_raf !== undefined) {
    // Бонус за отсутствие анти-паттерна (если не задан явно)
    if (weights.setState_in_raf === -5) {
      s += 3; // Дефолтный бонус
    }
  }

  return s;
}

function calculateHybridComplianceKPI(df) {
  const total = df.length;
  if (total === 0) return { fixed_timestep: 0, deterministic_rng: 0, tracks_system: 0 };
  
  // % has_fixed_timestep
  const fixedTimestepCount = df.filter(r => r.has_fixed_timestep).length;
  const fixedTimestepPct = (fixedTimestepCount / total) * 100;
  
  // % has_deterministic_rng AND NOT uses_math_random
  const deterministicRngCount = df.filter(r => r.has_deterministic_rng && !r.uses_math_random).length;
  const deterministicRngPct = (deterministicRngCount / total) * 100;
  
  // % has_tracks_system OR has_timeline_file
  const tracksSystemCount = df.filter(r => r.has_tracks_system || r.has_timeline_file).length;
  const tracksSystemPct = (tracksSystemCount / total) * 100;
  
  return {
    fixed_timestep: { count: fixedTimestepCount, total, pct: fixedTimestepPct },
    deterministic_rng: { count: deterministicRngCount, total, pct: deterministicRngPct },
    tracks_system: { count: tracksSystemCount, total, pct: tracksSystemPct },
  };
}

function printTop(df) {
  if (!df || df.length === 0) {
    console.log("\n=== No data to display ===");
    return;
  }
  
  // === HYBRID COMPLIANCE KPI (главный показатель) ===
  const kpi = calculateHybridComplianceKPI(df);
  console.log("\n=== HYBRID COMPLIANCE KPI (Target: 70% each) ===");
  console.log(`Fixed Timestep:        ${kpi.fixed_timestep.count}/${kpi.fixed_timestep.total}  (${kpi.fixed_timestep.pct.toFixed(1)}%)  ${kpi.fixed_timestep.pct >= 70 ? '✓' : '✗'}`);
  console.log(`Deterministic RNG:      ${kpi.deterministic_rng.count}/${kpi.deterministic_rng.total}  (${kpi.deterministic_rng.pct.toFixed(1)}%)  ${kpi.deterministic_rng.pct >= 70 ? '✓' : '✗'}`);
  console.log(`Tracks/Timeline System: ${kpi.tracks_system.count}/${kpi.tracks_system.total}  (${kpi.tracks_system.pct.toFixed(1)}%)  ${kpi.tracks_system.pct >= 70 ? '✓' : '✗'}`);
  
  // === COMPLIANCE SUMMARY ===
  console.log("\n=== COMPLIANCE SUMMARY ===");
  const complianceStats = {
    STABLE: df.filter(r => r.ENGINE_CLASS === "STABLE").length,
    SEMI: df.filter(r => r.ENGINE_CLASS === "SEMI").length,
    CHAOTIC: df.filter(r => r.ENGINE_CLASS === "CHAOTIC").length,
    NON_COMPLIANT: df.filter(r => r.ENGINE_CLASS === "NON_COMPLIANT").length,
    NON_DETERMINISTIC: df.filter(r => r.ENGINE_CLASS === "NON_DETERMINISTIC").length,
    INVALID: df.filter(r => r.ENGINE_CLASS === "INVALID").length,
  };
  for (const [cls, count] of Object.entries(complianceStats)) {
    console.log(`${cls.padEnd(20)} ${String(count).padStart(3)}`);
  }
  
  // === TOP ENGINE CANDIDATES (сначала по классу, потом по score) ===
  const classOrder = { STABLE: 0, SEMI: 1, CHAOTIC: 2, NON_COMPLIANT: 3, NON_DETERMINISTIC: 4, INVALID: 5 };
  
  // Сортируем: сначала по классу, потом по score внутри класса
  const sorted = df
    .map(r => ({ ...r, classOrder: classOrder[r.ENGINE_CLASS] }))
    .sort((a, b) => {
      if (a.classOrder !== b.classOrder) return a.classOrder - b.classOrder;
      return b.score - a.score;
    });
  
  const stable = sorted.filter(r => r.ENGINE_CLASS === "STABLE");
  const semi = sorted.filter(r => r.ENGINE_CLASS === "SEMI");
  
  if (stable.length >= 3) {
    console.log("\n=== TOP-5 ENGINE CANDIDATES (STABLE class) ===");
    for (const s of stable.slice(0, 5)) {
      console.log(`${s.variant.padEnd(40)} score: ${String(s.score).padStart(3)}  [${s.signature}]`);
    }
  } else if (semi.length > 0) {
    console.log("\n=== TOP-5 ENGINE CANDIDATES (SEMI class, STABLE < 3) ===");
    for (const s of semi.slice(0, 5)) {
      console.log(`${s.variant.padEnd(40)} score: ${String(s.score).padStart(3)}  [${s.signature}]`);
    }
    if (stable.length > 0) {
      console.log("\n(Also available STABLE variants: " + stable.map(r => r.variant).join(", ") + ")");
    }
  } else {
    console.log("\n=== TOP-5 ENGINE CANDIDATES (by class priority + score) ===");
    for (const s of sorted.slice(0, 5)) {
      console.log(`${s.variant.padEnd(40)} score: ${String(s.score).padStart(3)}  [${s.ENGINE_CLASS}]  [${s.signature}]`);
    }
  }
  
  // === Лучшие NON_COMPLIANT, но deterministic ===
  const almostCompliant = sorted
    .filter(r => r.ENGINE_CLASS === "NON_COMPLIANT" && r.has_deterministic_rng && !r.uses_math_random)
    .slice(0, 5);
  if (almostCompliant.length > 0) {
    console.log("\n=== ALMOST COMPLIANT (NON_COMPLIANT, but deterministic) ===");
    for (const s of almostCompliant) {
      console.log(`${s.variant.padEnd(40)} score: ${String(s.score).padStart(3)}  [${s.signature}]`);
    }
  }
  
  // === TOP FEATURES ===
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

  console.log("\n=== LIKELY PREMIUM (clusters+threads+hotspots+shadowBlur, NO setState_in_raf) ===");
  const premium = df.filter(
    (r) => r.has_clusters && r.has_threads && r.has_hotspots && r.has_shadow_blur && !r.setState_in_raf
  );
  console.log(premium.length ? premium.map((r) => `${r.variant} (score: ${r.score}, class: ${r.ENGINE_CLASS})`).join(", ") : "none");
}

async function main() {
  const variantDirs = listVariantDirs(VARIANTS_ROOT);
  console.log(`Found variants: ${variantDirs.length} in ${VARIANTS_ROOT}`);

  const results = [];

  for (const dir of variantDirs) {
    const variantName = path.basename(dir);
    const row = initFeatureRow(variantName);

    // Рекурсивный поиск всех TS/TSX файлов с игнорированием мусора
    const patterns = [
      "**/*.{ts,tsx}",
      "!**/node_modules/**",
      "!**/dist/**",
      "!**/.next/**",
      "!**/build/**",
      "!**/.git/**",
      "!**/coverage/**",
      "!**/__tests__/**",
      "!**/*.test.{ts,tsx}",
      "!**/*.spec.{ts,tsx}",
    ];
    const files = await fg(patterns, { cwd: dir, absolute: true });

    // Диагностика для одного варианта (временно, для отладки)
    if (variantName === "aetheris_-hybrid-simulation-engine") {
      console.log(`  🔍 DEBUG ${variantName}: files found:`, files.slice(0, 20).map(f => path.relative(dir, f).replace(/\\/g, '/')));
    }

    if (files.length === 0) {
      console.log(`  ⚠️  ${variantName}: no TS/TSX files, skipping`);
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
        
        // Проверка имени файла для has_timeline_file
        const fileName = path.basename(f).toLowerCase();
        if (fileName.includes("timeline") && (fileName.endsWith(".ts") || fileName.endsWith(".tsx"))) {
          markFeature(row, "has_timeline_file", true);
        }
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
    
    // Генерация compliance таблицы
    row.compliance = generateComplianceTable(row);
    row.compliance_score = row.compliance.filter(r => r.pass).length;
    row.compliance_total = row.compliance.length;

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

