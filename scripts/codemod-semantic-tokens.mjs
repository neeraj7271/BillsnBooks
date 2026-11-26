import fs from 'fs';
import path from 'path';

const ROOTS = ['packages/ui/src', 'apps/web/src'];

// Map raw palette tokens to semantic tokens defined in tailwind.config.js / globals.css
function mapToken(prefix, palette, shade, opacity) {
  const s = Number(shade);
  const op = opacity ? `/${opacity}` : '';

  // Neutral palettes -> canvas / surface / border / text
  if (palette === 'slate' || palette === 'gray' || palette === 'zinc') {
    if (prefix === 'text') {
      if (s >= 800) return 'text-primary';
      if (s >= 600) return 'text-secondary';
      if (s >= 300) return 'text-muted';
      return 'text-primary-inverse';
    }
    if (prefix === 'bg') {
      if (s >= 900) return 'bg-surface';
      if (s >= 700) return 'bg-surface-raised';
      if (s >= 100) return `bg-surface-sunken${op}`;
      return 'bg-canvas';
    }
    if (prefix === 'border' || prefix === 'divide') {
      if (s >= 400) return `${prefix}-strong`;
      if (s <= 150) return `${prefix}-subtle`;
      return `${prefix}`;
    }
    if (prefix === 'ring') return 'ring-border-focus';
    if (prefix === 'placeholder') return 'placeholder:text-muted';
    if (prefix === 'fill' || prefix === 'stroke') return `${prefix}-current`;
  }

  // Brand palettes -> brand
  if (palette === 'blue' || palette === 'indigo' || palette === 'violet' || palette === 'purple') {
    if (prefix === 'text') return s >= 500 ? 'text-brand-text' : 'text-brand';
    if (prefix === 'bg') return s >= 500 ? `bg-brand${op}` : `bg-brand-subtle${op}`;
    if (prefix === 'border' || prefix === 'divide') return `${prefix}-focus`;
    if (prefix === 'ring') return 'ring-focus-ring';
    if (prefix === 'from' || prefix === 'to' || prefix === 'via') return `${prefix}-brand`;
    return `${prefix}-brand`;
  }

  // Success -> status-success
  if (palette === 'emerald') {
    if (prefix === 'text') return 'text-status-success-text';
    if (prefix === 'bg') return s >= 500 ? 'bg-status-success' : 'bg-status-success-subtle';
    if (prefix === 'border') return 'border-status-success';
    if (prefix === 'ring') return 'ring-status-success';
    return `${prefix}-status-success`;
  }

  // Danger -> status-danger
  if (palette === 'rose') {
    if (prefix === 'text') return 'text-status-danger-text';
    if (prefix === 'bg') return s >= 500 ? 'bg-status-danger' : 'bg-status-danger-subtle';
    if (prefix === 'border') return 'border-status-danger';
    if (prefix === 'ring') return 'ring-status-danger';
    return `${prefix}-status-danger`;
  }

  // Warning -> status-warning
  if (palette === 'amber' || palette === 'orange') {
    if (prefix === 'text') return 'text-status-warning-text';
    if (prefix === 'bg') return s >= 500 ? 'bg-status-warning' : 'bg-status-warning-subtle';
    if (prefix === 'border') return 'border-status-warning';
    if (prefix === 'ring') return 'ring-status-warning';
    return `${prefix}-status-warning`;
  }

  // Info -> status-info
  if (palette === 'sky') {
    if (prefix === 'text') return 'text-status-info-text';
    if (prefix === 'bg') return s >= 500 ? 'bg-status-info' : 'bg-status-info-subtle';
    if (prefix === 'border') return 'border-status-info';
    if (prefix === 'ring') return 'ring-status-info';
    return `${prefix}-status-info`;
  }

  return null;
}

const TOKEN_RE =
  /\b((?:dark:|hover:|focus:|focus-visible:|active:|group-hover:|print:)*)(text|bg|border|ring|from|to|via|divide|placeholder|fill|stroke)-(slate|zinc|gray|blue|rose|emerald|indigo|amber|orange|sky|violet|purple)-([0-9]+)(?:\/([0-9]+))?\b/g;

let changedFiles = 0;
let replacements = 0;

function processFile(filePath) {
  const orig = fs.readFileSync(filePath, 'utf8');
  const next = orig.replace(TOKEN_RE, (full, modifiers, prefix, palette, shade, opacity) => {
    const mapped = mapToken(prefix, palette, shade, opacity);
    if (!mapped) return full;
    replacements++;
    // Drop redundant dark: modifier because semantic tokens already adapt to .dark via CSS vars
    const cleanMods = modifiers.replace(/dark:/g, '');
    return `${cleanMods}${mapped}`;
  });
  if (next !== orig) {
    fs.writeFileSync(filePath, next, 'utf8');
    changedFiles++;
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) processFile(full);
  }
}

for (const r of ROOTS) walk(r);
console.log(`Codemod complete: ${changedFiles} files updated, ${replacements} tokens replaced.`);
