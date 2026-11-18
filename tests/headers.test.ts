// Verify public/_headers stays well-formed as dist/ gains or loses files.
//
// SCOPE LIMIT (important): this test validates the _headers FILE FORMAT and
// that every dist/ path would resolve to a rule IF a Netlify/Cloudflare-style
// host honored the file. It does NOT verify that the live deploy host applies
// these headers. GitHub Pages does NOT honor _headers (see the header comment
// in public/_headers and REVIEW.md C1) — so on the current Pages deploy the
// headers in this file are inert. This guard is the single source of truth
// for the desired header set; keep it in sync with any Cloudflare/Caddy rules
// that later actually apply them.
//
// Two guards:
//   1. Every dist/ path resolves to exactly ONE _headers rule
//      (first matching path, Netlify/Cf-style). The site is static, so a
//      path either already matches or no future content-type or file will
//      — but a *new* top-level file (e.g. /robots.txt, /favicon.ico)
//      would silently fall into no rule unless we catch it here.
//   2. The rules that carry security policies (HTML documents)
//      still parse as CSP directives we recognize.
//
// The file is copied verbatim into dist/ on every build; we read it
// from public/ so a fresh build can't accidentally ship a rule set that
// only works against a stale dist/.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function parseHeadersFile(raw) {
  // Netlify-style _headers: path line, then "Key: Value" indented or
  // not, blank lines separate blocks. Comments are whole-line.
  const rules = [];
  const lines = raw.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (line[0] && !/\s/.test(line[0])) {
      // A top-level token is either a path or a "Key: Value" header line.
      const match = trimmed.match(/^([A-Za-z-][A-Za-z0-9-]*):(.*)$/);
      if (match && !trimmed.startsWith('/')) {
        // Header belonging to the current path
        if (!current) throw new Error(`Header "${trimmed}" before a path in _headers`);
        const value = match[2].trim();
        current.headers.push({ key: match[1], value });
      } else {
        // New path
        current = { path: trimmed, headers: [] };
        rules.push(current);
      }
    } else {
      // Indented header under the current path
      const match = trimmed.match(/^([A-Za-z-][A-Za-z0-9-]*):(.*)$/);
      if (match && current) {
        current.headers.push({ key: match[1], value });
      } else if (trimmed) {
        throw new Error(`Unparseable line in _headers: "${trimmed}"`);
      }
    }
  }
  return rules;
}

function globToRegex(glob) {
  // _headers supports a small glob vocabulary: / (whole site),
  // /foo/** (recursive under dir), /foo/ (dir prefix), /*.ext (suffix),
  // /exact. Returns a predicate on a posix-style absolute path
  // (e.g. /assets/device/x.png or /index.html).
  return (p) => {
    if (glob === '/') return true;
    if (glob.endsWith('/**')) return p.startsWith(glob.slice(0, -2));
    if (glob.endsWith('/')) return p === glob || p.startsWith(glob);
    if (glob.startsWith('/*.') && !glob.endsWith('*')) return p.endsWith(glob.slice(1));
    // Exact (covers /editor/index.html, /assets/..., etc.)
    return p === glob;
  };
}

describe('public/_headers', () => {
  const raw = readFileSync(join(PUBLIC_DIR, '_headers'), 'utf8');
  const rules = parseHeadersFile(raw);

  it('exists and parses into at least 4 rules', () => {
    expect(rules.length).toBeGreaterThanOrEqual(4);
  });

  it('every rule carries X-Content-Type-Options: nosniff', () => {
    for (const r of rules) {
      const h = r.headers.find((x) => x.key === 'X-Content-Type-Options');
      expect(h?.value, `${r.path} missing X-Content-Type-Options`).toBe('nosniff');
    }
  });

  it('every rule carries Referrer-Policy: no-referrer', () => {
    for (const r of rules) {
      const h = r.headers.find((x) => x.key === 'Referrer-Policy');
      expect(h?.value, `${r.path} missing Referrer-Policy`).toBe('no-referrer');
    }
  });

  it('HTML document rules carry X-Frame-Options: DENY', () => {
    // Only actual document paths — the device index + 404 pages (*.html)
    // and the whole-site wildcard. /assets/ and /_astro/ are static
    // resource prefixes that do not need X-Frame-Options.
    const docRules = rules.filter((r) => r.path === '/*.html' || r.path === '/');
    expect(docRules.length).toBeGreaterThanOrEqual(1);
    for (const r of docRules) {
      const h = r.headers.find((x) => x.key === 'X-Frame-Options');
      expect(h?.value, `${r.path} missing X-Frame-Options`).toBe('DENY');
    }
  });

  it('HTML document rules carry a parseable CSP with frame-ancestors none', () => {
    const htmlRules = rules.filter((r) => r.path === '/*.html');
    expect(htmlRules.length).toBe(1);
    for (const r of htmlRules) {
      const csp = r.headers.find((x) => x.key === 'Content-Security-Policy');
      expect(csp, `${r.path} missing CSP`).toBeDefined();
      expect(csp.value).toMatch(/frame-ancestors\s+'?none'?/);
      expect(csp.value).toMatch(/default-src\s+'?self'?/);
    }
  });

  it('dist/ has no path that matches zero rules (would be unguarded)', () => {
    // Walk dist/ and require every file to hit a rule. The CI runs
    // `npm run build` before this test (see .github/workflows/pages.yml),
    // so dist/ is always present there; locally, skip cleanly when
    // it hasn't been built yet.
    if (!existsSync(DIST_DIR)) return;
    const matches = (p) => rules.find((r) => globToRegex(r.path)(p));
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else files.push('/' + relative(DIST_DIR, full).replace(/\\/g, '/'));
      }
    };
    walk(DIST_DIR);
    const unmatched = files.filter((f) => !matches(f));
    expect(unmatched, `Paths with no _headers rule: ${unmatched.join(', ')}`).toEqual([]);
  });
});
