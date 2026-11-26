#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const targetDir = process.argv[2] || 'src';
const errors = [];

const RAW_PALETTE_RE =
  /\b(?:dark:|hover:|focus:|focus-visible:|active:|group-hover:|print:)*(?:text|bg|border|ring|from|to|via|divide|placeholder|fill|stroke)-(?:slate|zinc|gray|blue|rose|emerald|indigo|amber|orange|sky|violet|purple)-[0-9]+(?:\/[0-9]+)?\b/g;

const BG_COLOR_TOKENS = new Set([
  'bg-canvas', 'bg-surface', 'bg-surface-raised', 'bg-surface-sunken', 'bg-surface-overlay',
  'bg-brand', 'bg-brand-hover', 'bg-brand-subtle',
  'bg-status-success', 'bg-status-success-subtle',
  'bg-status-warning', 'bg-status-warning-subtle',
  'bg-status-danger', 'bg-status-danger-subtle',
  'bg-status-info', 'bg-status-info-subtle',
  'bg-white', 'bg-black', 'bg-transparent',
]);

const TEXT_COLOR_TOKENS = new Set([
  'text-primary', 'text-secondary', 'text-muted', 'text-inverse', 'text-primary-inverse',
  'text-brand', 'text-brand-text',
  'text-status-success', 'text-status-success-text',
  'text-status-warning', 'text-status-warning-text',
  'text-status-danger', 'text-status-danger-text',
  'text-status-info', 'text-status-info-text',
  'text-white', 'text-black', 'text-inherit', 'text-current',
]);

function walk(target) {
  if (fs.statSync(target).isFile()) {
    if (/\.(ts|tsx)$/.test(target)) checkFile(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') continue;
      walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      checkFile(full);
    }
  }
}

function splitScope(cls) {
  const parts = cls.split(':');
  const base = parts.pop();
  const scope = parts.sort().join(':');
  return { scope, base };
}

function checkClassString(file, lineNum, raw) {
  // Ignore template expressions ${...}
  const cleaned = raw.replace(/\$\{[^}]*\}/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return;

  const seen = new Set();
  const bgByScope = new Map();
  const textByScope = new Map();
  let hasInverse = false;
  let hasNonInverseSurface = false;

  for (const tok of tokens) {
    if (!/^[a-z0-9:\/\[\]._-]+$/i.test(tok)) continue;

    // 1. Duplicate exact utility
    if (seen.has(tok) && (tok === 'border' || tok.startsWith('bg-') || tok.startsWith('text-') || tok.startsWith('border-'))) {
      errors.push(`${file}:${lineNum} duplicate utility "${tok}"`);
    }
    seen.add(tok);

    const { scope, base } = splitScope(tok);

    // 2. Conflicting bg color in same scope
    if (BG_COLOR_TOKENS.has(base)) {
      if (bgByScope.has(scope) && bgByScope.get(scope) !== tok) {
        errors.push(`${file}:${lineNum} conflicting background classes "${bgByScope.get(scope)}" and "${tok}"`);
      }
      bgByScope.set(scope, tok);
      if (scope === '' && (base === 'bg-surface' || base === 'bg-canvas' || base === 'bg-surface-raised' || base === 'bg-surface-sunken' || base === 'bg-white')) {
        hasNonInverseSurface = true;
      }
    }

    // 3. Conflicting text color in same scope
    if (TEXT_COLOR_TOKENS.has(base)) {
      if (textByScope.has(scope) && textByScope.get(scope) !== tok) {
        errors.push(`${file}:${lineNum} conflicting text classes "${textByScope.get(scope)}" and "${tok}"`);
      }
      textByScope.set(scope, tok);
      if (scope === '' && (base === 'text-inverse' || base === 'text-primary-inverse')) {
        hasInverse = true;
      }
    }
  }

  // 4. -inverse text on a non-inverse surface
  if (hasInverse && hasNonInverseSurface) {
    errors.push(`${file}:${lineNum} inverse text token used on a non-inverse surface`);
  }
}

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  const rawMatches = content.match(RAW_PALETTE_RE);
  if (rawMatches) {
    errors.push(`${file}: raw palette classes found: ${[...new Set(rawMatches)].slice(0, 5).join(', ')}`);
  }

  // Check static string literals inside className="..." or '...'
  const strRe = /(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip import lines
    if (/^\s*import\s/.test(line)) continue;
    let m;
    while ((m = strRe.exec(line)) !== null) {
      const val = m[2];
      if (val.includes('bg-') || val.includes('text-') || val.includes('border ')) {
        checkClassString(file, i + 1, val);
      }
    }
  }
}

if (!fs.existsSync(targetDir)) {
  console.error(`Target directory not found: ${targetDir}`);
  process.exit(1);
}

walk(targetDir);

if (errors.length > 0) {
  console.error(`\n[lint:tokens] Found ${errors.length} token violation(s):\n`);
  for (const e of errors.slice(0, 60)) {
    console.error(`  - ${e}`);
  }
  if (errors.length > 60) {
    console.error(`  ... and ${errors.length - 60} more.`);
  }
  process.exit(1);
}

console.log(`[lint:tokens] Passed (${targetDir}: 0 raw palette or conflicting utility classes).`);
