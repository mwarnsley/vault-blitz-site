#!/usr/bin/env node
/**
 * Pre-publication check for the static site. No dependencies.
 *
 *   node tools/check-site.mjs            local checks (open owner items are reported, not fatal)
 *   node tools/check-site.mjs --publish  also fails while any owner item remains
 *   node tools/check-site.mjs --base http://127.0.0.1:8123/vault-blitz-site/
 *                                        also fetches every page and link target over HTTP
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const publish = args.includes('--publish');
const baseIndex = args.indexOf('--base');
const base = baseIndex === -1 ? null : args[baseIndex + 1];
const PAGES = ['index.html', 'privacy.html', 'terms.html', 'support.html', '404.html'];
const SUPPORT_EMAIL = 'idreamofcode@gmail.com';

const errors = [];
const notes = [];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === '.git') return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// Only the site, its check script and repository metadata belong here.
const allowed = /^(?:[a-z0-9-]+\.html|assets\/[a-z0-9-]+\.(?:css|png)|tools\/check-site\.mjs|README\.md|\.nojekyll|\.gitignore)$/;
for (const path of files(root)) {
  const rel = relative(root, path);
  if (!allowed.test(rel)) errors.push(`unexpected file: ${rel}`);
}

for (const page of PAGES) {
  const html = readFileSync(join(root, page), 'utf8');
  if (!/^<!doctype html>/i.test(html)) errors.push(`${page}: missing doctype`);
  if (!/<html lang="en">/.test(html)) errors.push(`${page}: missing lang`);
  if (!/<meta name="viewport"/.test(html)) errors.push(`${page}: missing viewport`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${page}: missing title`);
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) errors.push(`${page}: needs exactly one h1`);
  if (!html.includes('href="#main"') || !html.includes('id="main"'))
    errors.push(`${page}: missing skip link target`);
  if (page !== '404.html' && !/aria-current="page"/.test(html))
    errors.push(`${page}: navigation does not mark the current page`);

  // No scripts, trackers, external fonts, frames or forms.
  if (/<script|<iframe|<form|<embed|<object|fonts\.(?:googleapis|gstatic)|googletagmanager|gtag\(|plausible|segment\.|hotjar|document\.cookie/i.test(html))
    errors.push(`${page}: contains a script, frame, form, font or tracking reference`);
  if (/apps\.apple\.com|play\.google\.com\/store|testflight\.apple\.com\/join/i.test(html))
    errors.push(`${page}: contains a store or download link`);
  if (/TODO|lorem|example\.com|placeholder@|\[[A-Z ]+\]/i.test(html.replace(/(?:data-)?owner-todo/g, '')))
    errors.push(`${page}: contains placeholder text`);
  if (/(?:sk|pk|sntrys|ghp|eyJ)[_-]?[A-Za-z0-9]{20,}|ingest(?:\.us)?\.sentry\.io/.test(html))
    errors.push(`${page}: contains something that looks like a credential or DSN`);

  const todos = (html.match(/data-owner-todo/g) ?? []).length;
  if (todos > 0) (publish ? errors : notes).push(`${page}: ${todos} owner item(s) open`);

  for (const [, attr, target] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (target.startsWith('mailto:')) {
      if (!target.startsWith(`mailto:${SUPPORT_EMAIL}`))
        errors.push(`${page}: unexpected email ${target}`);
      continue;
    }
    if (/^https:\/\//.test(target)) continue;
    if (/^http:\/\//.test(target)) {
      errors.push(`${page}: insecure link ${target}`);
      continue;
    }
    if (target.startsWith('#')) {
      if (!html.includes(`id="${target.slice(1)}"`)) errors.push(`${page}: broken anchor ${target}`);
      continue;
    }
    // Root-relative links must stay under the project path (only 404.html uses them).
    let local = target;
    if (local.startsWith('/')) {
      if (!local.startsWith('/vault-blitz-site/')) {
        errors.push(`${page}: ${attr} escapes the project base path: ${target}`);
        continue;
      }
      local = local.slice('/vault-blitz-site/'.length);
    }
    const [path, hash] = local.replace(/^\.\//, '').split('#');
    const file = path === '' ? 'index.html' : path;
    try {
      const body = readFileSync(join(root, file), 'utf8');
      if (hash && !body.includes(`id="${hash}"`)) errors.push(`${page}: broken anchor ${target}`);
    } catch {
      errors.push(`${page}: missing ${attr} target ${target}`);
    }
  }
}

if (base) {
  const urls = new Set([base, ...PAGES.filter((p) => p !== 'index.html').map((p) => base + p)]);
  urls.add(base + 'assets/styles.css');
  urls.add(base + 'assets/favicon.png');
  urls.add(base + 'assets/vault-blitz-mark.png');
  for (const url of urls) {
    const response = await fetch(url, { redirect: 'follow' });
    if (response.status !== 200) errors.push(`HTTP ${response.status}: ${url}`);
    else if (response.headers.get('set-cookie')) errors.push(`sets a cookie: ${url}`);
  }
  const missing = await fetch(base + 'no-such-page');
  if (missing.status !== 404) notes.push(`missing page returned HTTP ${missing.status}, not 404`);
}

for (const note of notes) console.log(`note: ${note}`);
for (const error of errors) console.error(`error: ${error}`);
console.log(errors.length === 0 ? 'site check passed' : `site check failed (${errors.length})`);
process.exit(errors.length === 0 ? 0 : 1);
