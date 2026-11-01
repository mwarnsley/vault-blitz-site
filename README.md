# Vault Blitz: Heist Match — website

The public website for Vault Blitz: Heist Match: Home, Privacy Policy, Terms of Service and Support.
Plain HTML and one stylesheet, served by GitHub Pages at
`https://mwarnsley.github.io/vault-blitz-site/`. No build step, scripts, cookies, analytics or
external fonts.

| Path                            | Page            |
| ------------------------------- | --------------- |
| `index.html`                    | Home            |
| `privacy.html`                  | Privacy Policy  |
| `terms.html`                    | Terms of Service |
| `support.html`                  | Support         |
| `404.html`                      | Not found       |
| `assets/styles.css`             | Shared styles   |
| `assets/vault-blitz-mark.png`   | App icon, resized from the game repository (see below) |
| `tools/check-site.mjs`          | Pre-publication check |

All pages link relatively, so they work under the `/vault-blitz-site/` project path.
`404.html` is served for any missing path, so it uses root-relative links under that path.

## Icon provenance

`assets/vault-blitz-mark.png` and `assets/favicon.png` are resized from the game's
`assets/icon.png`. The owner generated that icon with Google Gemini specifically for Vault Blitz.
Google's Terms of Service say Google does not claim ownership of content you generate. Purely
AI-generated imagery may not be protected by copyright, so the site does not claim exclusive
copyright in it. A visual review found no recognizable third-party logos or characters; that
review is not a rights clearance or a trademark clearance, and no trademark search has been done.

## Checking

```sh
node tools/check-site.mjs                 # structure, links, no tracking, no secrets
node tools/check-site.mjs --publish       # also fails while any owner item is open
# Serve only this folder under the Pages base path, then check it over HTTP from another shell:
mkdir -p /tmp/vb-preview && ln -sfn "$PWD" /tmp/vb-preview/vault-blitz-site
python3 -m http.server 8123 --bind 127.0.0.1 --directory /tmp/vb-preview
node tools/check-site.mjs --base http://127.0.0.1:8123/vault-blitz-site/
```

Open owner items are marked in the pages with `data-owner-todo` and highlighted.

## Keeping the policy accurate

The Privacy Policy describes the current test builds: saves on the device only, Sentry crash
and error reports, and no online game server, purchases, accounts or analytics. Update it, and the
App Store and Google Play privacy disclosures, **before** a build turns on any of these:

- online bounties, raids or published vaults (Supabase and an anonymous guest account);
- real-money purchases (for example a purchase SDK such as RevenueCat, or store billing);
- analytics or any other new third-party SDK;
- a change to what Sentry reports, or to the Sentry project's IP-address and retention settings.

Change the effective date on the page whenever its substance changes.

## Publishing

GitHub Pages serves the `main` branch from the repository root (`.nojekyll` turns off Jekyll).
