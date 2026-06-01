const fs = require('fs');
const path = require('path');

// ─── Color mapping: old → new ───────────────────────────────────────────────
// LIGHT MODE brand (was indigo/purple, now Electric Blue)
// DARK MODE brand (was indigo, now Vibrant Blue)
// Dark backgrounds: old dark (#0d1117, #161b27...) → new navy (#0b132b, #1c2541...)

const replacements = [
  // ── Primary brand colors (indigo → blue) ──────────────────────────────────
  { search: /#6366f1/gi,  replace: '#2563eb' },  // primary indigo → electric blue
  { search: /#4f46e5/gi,  replace: '#1d4ed8' },  // primary-dark → royal blue
  { search: /#818cf8/gi,  replace: '#3b82f6' },  // dark-mode primary → vibrant blue
  { search: /#a5b4fc/gi,  replace: '#60a5fa' },  // indigo-300 → sky blue
  { search: /#c7d2fe/gi,  replace: '#bfdbfe' },  // indigo-200 → blue-200
  { search: /#e0e7ff/gi,  replace: '#dbeafe' },  // indigo-100 → blue-100
  { search: /#eef2ff/gi,  replace: '#eff6ff' },  // indigo-50 → blue-50

  // ── Darker indigo tones ────────────────────────────────────────────────────
  { search: /#4338ca/gi,  replace: '#1e40af' },
  { search: /#312e81/gi,  replace: '#1e3a8a' },
  { search: /#1e1b4b/gi,  replace: '#172554' },
  { search: /#3730a3/gi,  replace: '#1d4ed8' },

  // ── rgba indigo → rgba blue ────────────────────────────────────────────────
  { search: /rgba\(\s*99\s*,\s*102\s*,\s*241\s*,/gi,   replace: 'rgba(37, 99, 235,' },
  { search: /rgba\(\s*79\s*,\s*70\s*,\s*229\s*,/gi,    replace: 'rgba(29, 78, 216,' },
  { search: /rgba\(\s*129\s*,\s*140\s*,\s*248\s*,/gi,  replace: 'rgba(59, 130, 246,' },
  { search: /rgba\(\s*67\s*,\s*56\s*,\s*202\s*,/gi,    replace: 'rgba(29, 78, 216,' },
  { search: /rgba\(\s*109\s*,\s*40\s*,\s*217\s*,/gi,   replace: 'rgba(37, 99, 235,' },

  // ── Dark mode backgrounds (old dark → new navy) ────────────────────────────
  { search: /#0d1117/gi,  replace: '#0b132b' },   // bg-body dark
  { search: /#0a0e1a/gi,  replace: '#070d1f' },
  { search: /#0a1628/gi,  replace: '#081020' },
  { search: /#0f172a/gi,  replace: '#0b132b' },   // topbar-bg dark
  { search: /#0d1524/gi,  replace: '#0b132b' },
  { search: /#111827/gi,  replace: '#0e1933' },   // sidebar-bg dark → deep navy  ← BUT only for dark mode contexts
  { search: /#161b27/gi,  replace: '#1c2541' },   // surface dark
  { search: /#1e2535/gi,  replace: '#212b4a' },   // surface-hi dark
  { search: /#232d3f/gi,  replace: '#28355a' },   // bg-gray-100 dark

  // ── Dark mode text (old slate → new gray palette) ─────────────────────────
  { search: /#e2e8f0/gi,  replace: '#f3f4f6' },   // text-primary dark
  { search: /#cbd5e1/gi,  replace: '#d1d5db' },   // text-secondary dark
  { search: /#64748b/gi,  replace: '#9ca3af' },   // text-muted dark (was too dark)
  { search: /#475569/gi,  replace: '#6b7280' },   // text-light dark
  { search: /#334155/gi,  replace: '#374151' },

  // ── Purple accent → blue accent (in dark themes) ──────────────────────────
  { search: /#a78bfa/gi,  replace: '#60a5fa' },   // purple-400 → sky blue
  { search: /#8b5cf6/gi,  replace: '#3b82f6' },   // purple-500 → vibrant blue
  { search: /#7c3aed/gi,  replace: '#2563eb' },   // purple-600 → electric blue
  { search: /#6d28d9/gi,  replace: '#1d4ed8' },   // purple-700 → royal blue
  { search: /#ede9fe/gi,  replace: '#dbeafe' },   // purple bg → blue bg
  { search: /rgba\(\s*167\s*,\s*139\s*,\s*250\s*,/gi, replace: 'rgba(96, 165, 250,' },
  { search: /rgba\(\s*124\s*,\s*58\s*,\s*237\s*,/gi,  replace: 'rgba(37, 99, 235,' },
  { search: /rgba\(\s*139\s*,\s*92\s*,\s*246\s*,/gi,  replace: 'rgba(59, 130, 246,' },
  { search: /rgba\(\s*109\s*,\s*40\s*,\s*217\s*,\s*0\.2\)/gi, replace: 'rgba(37, 99, 235, 0.2)' },

  // ── Light mode text ────────────────────────────────────────────────────────
  { search: /#6b7280/gi,  replace: '#4b5563' },   // text-muted light
];

// ─── Walk filesystem ─────────────────────────────────────────────────────────
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.(jsx?|css)$/.test(file)) {
      results.push(full);
    }
  });
  return results;
}

// ─── Apply ───────────────────────────────────────────────────────────────────
const files = walk('./src');
let totalChanged = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  replacements.forEach(({ search, replace }) => {
    content = content.replace(search, replace);
  });
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ Updated:', path.relative('.', file));
    totalChanged++;
  }
});

console.log(`\nDone. Updated ${totalChanged} files.`);
