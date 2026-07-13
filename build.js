#!/usr/bin/env node
/**
 * Static site generator for djadigitalstudio.com.
 *
 * Reads apps.config.js and regenerates, in place:
 *   - apps/{id}/index.html      (live apps only)
 *   - privacy/{id}/index.html   (live + retired apps)
 *   - terms/{id}/index.html     (live + retired apps)
 *   - the app-card grids inside index.html and support/index.html
 *   - sitemap.xml
 *   - robots.txt
 *
 * Hand-authored pages (contact/, privacy.html, terms.html, refund.html,
 * data-deletion.html, eula.html, 404.html, email-templates/, etc.) are not
 * touched — only the app-specific and app-list surfaces above are generated.
 *
 * Run: node build.js
 * See ARCHITECTURE.md for the full explanation of how this fits together.
 */

const fs = require('fs');
const path = require('path');
const { COMPANY, APPS } = require('./apps.config.js');

const ROOT = __dirname;

// ---------- shared head / nav / footer ----------

function headBlock({ title, description, canonical, ogType = 'website', jsonLd, extraOg = {} }) {
  const og = Object.entries({ title, description, type: ogType, url: canonical, ...extraOg })
    .map(([k, v]) => `<meta property="og:${k}" content="${v}">`)
    .join('\n');
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#080808">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
${og}
<meta name="twitter:card" content="summary">
${jsonLd ? `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Josefin+Sans:wght@200;300;400&display=swap" rel="stylesheet">`;
}

const NOISE_BG = `body::before { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E"); opacity: 0.025; pointer-events: none; z-index: 9999; }`;

function accentVars(accent) {
  // Both --gold and --rose are always defined; `accent` picks which one the
  // page's interactive elements (buttons, links, eyebrow) actually use.
  return accent === 'rose'
    ? { a: 'rose', aLight: 'rose-light', navHover: 'rose-light' }
    : { a: 'gold', aLight: 'gold-light', navHover: 'gold' };
}

function footer({ appId, legalLinks, extraLinks = [] }) {
  const links = [...legalLinks, ...extraLinks].map(([label, href]) => `    <li><a href="${href}">${label}</a></li>`).join('\n');
  return `<footer>
  <div class="footer-logo">${appId ? appLogoMark(appId) : `DJ&<span>A</span> Digital Studio`}</div>
  <p class="footer-copy">© 2026 ${COMPANY.legalName}. All rights reserved.</p>
  <ul class="footer-links">
${links}
  </ul>
</footer>`;
}

function appLogoMark(appId) {
  const app = APPS.find(a => a.id === appId);
  if (!app) return `DJ&<span>A</span> Digital Studio`;
  const words = app.name.split(' ');
  const last = words.pop();
  return `${words.join(' ')} <span>${last}</span>`;
}

// ---------- app landing page ----------

function renderAppLanding(app) {
  const { a, aLight, navHover } = accentVars(app.accent);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    applicationCategory: app.structuredDataCategory,
    operatingSystem: 'iOS, Android',
    author: { '@type': 'Organization', name: COMPANY.legalName },
    ...(app.price ? { offers: { '@type': 'Offer', price: app.price.amount, priceCurrency: app.price.currency } } : {}),
  };
  const featuresHtml = app.features.map(f => `    <div class="feature">
      <div class="feature-icon">◈</div>
      <div class="feature-name">${f.name}</div>
      <p class="feature-desc">${f.desc}</p>
    </div>`).join('\n');
  const faqHtml = app.faqs.map(f => `    <div class="faq-item">
      <p class="faq-q">${f.q}</p>
      <p class="faq-a">${f.a}</p>
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({
    title: app.metaTitle,
    description: app.metaDescription,
    canonical: `${COMPANY.siteUrl}/apps/${app.id}/`,
    jsonLd,
  })}
<style>
  :root { --black: #080808; --deep: #0d0d0d; --surface: #111111; --surface2: #161616; --border: #222222; --gold: #c9a84c; --gold-light: #e4c87a; --rose: #c4856a; --rose-light: #d9a08a; --text: #e8e0d0; --text-muted: #8a8070; --text-dim: #847b6c; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: var(--black); color: var(--text); font-family: 'Josefin Sans', sans-serif; font-weight: 300; letter-spacing: 0.04em; overflow-x: hidden; }
  ${NOISE_BG}
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 24px 60px; background: rgba(8,8,8,0.98); }
  .nav-logo { text-decoration: none; color: var(--text); font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 400; letter-spacing: 0.05em; }
  .nav-logo span { color: var(--gold-light); font-style: italic; }
  .nav-logo-img { height: 112px; width: auto; display: block; }
  .nav-back { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); text-decoration: none; transition: color 0.3s; }
  .nav-back:hover { color: var(--${navHover}); }
  @media (max-width: 768px) { nav { padding: 20px 24px; } .nav-logo-img { height: 68px; } }
  .hero { min-height: 80vh; display: flex; flex-direction: column; justify-content: center; padding: 190px 60px 60px; max-width: 900px; }
  .hero-eyebrow { font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--${a}); margin-bottom: 24px; display: flex; align-items: center; gap: 14px; }
  .hero-eyebrow::before { content: ''; display: block; width: 32px; height: 1px; background: var(--${a}); }
  .hero-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(3rem, 7vw, 5.5rem); line-height: 1.0; margin-bottom: 24px; }
  .hero-title em { font-style: italic; color: var(--${aLight}); }
  .hero-sub { font-size: 0.82rem; line-height: 2; color: var(--text-muted); max-width: 520px; margin-bottom: 48px; }
  .btn-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .btn { display: inline-block; font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 32px; text-decoration: none; transition: all 0.3s; }
  .btn-primary { background: var(--${a}); color: var(--black); }
  .btn-primary:hover { background: var(--${aLight}); }
  .btn-ghost { border: 1px solid var(--border); color: var(--text-muted); }
  .btn-ghost:hover { border-color: var(--${a}); color: var(--${a}); }
  .features { padding: 80px 60px; max-width: 1000px; margin: 0 auto; }
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-top: 48px; }
  .feature { background: var(--surface); padding: 36px 32px; border: 1px solid var(--border); }
  .feature-icon { font-size: 1.4rem; margin-bottom: 16px; color: var(--${a}); }
  .feature-name { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 400; margin-bottom: 12px; color: var(--${aLight}); }
  .feature-desc { font-size: 0.75rem; line-height: 1.9; color: var(--text-muted); }
  .support { padding: 80px 60px; max-width: 1000px; margin: 0 auto; border-top: 1px solid var(--border); }
  .section-eyebrow { font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--${a}); margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
  .section-eyebrow::before { content: ''; display: block; width: 24px; height: 1px; background: var(--${a}); }
  .section-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.1; margin-bottom: 40px; }
  .section-title em { font-style: italic; color: var(--${aLight}); }
  .faq { display: flex; flex-direction: column; gap: 2px; }
  .faq-item { background: var(--surface); border: 1px solid var(--border); padding: 28px 32px; }
  .faq-q { font-size: 0.8rem; letter-spacing: 0.05em; color: var(--text); margin-bottom: 10px; }
  .faq-a { font-size: 0.75rem; line-height: 1.9; color: var(--text-muted); }
  .contact-box { background: var(--surface); border: 1px solid var(--border); padding: 40px; margin-top: 48px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
  .contact-label { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px; }
  .contact-email { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; color: var(--${aLight}); text-decoration: none; }
  .contact-email:hover { color: var(--text); }
  footer { display: flex; align-items: center; justify-content: space-between; padding: 32px 60px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 16px; }
  .footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: var(--text-muted); letter-spacing: 0.05em; }
  .footer-logo span { color: var(--${aLight}); font-style: italic; }
  .footer-copy { font-size: 0.6rem; letter-spacing: 0.1em; color: var(--text-dim); }
  .footer-links { display: flex; gap: 22px; flex-wrap: wrap; list-style: none; }
  .footer-links a { font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-dim); text-decoration: none; transition: color 0.3s; }
  .footer-links a:hover { color: var(--${aLight}); }
  @media (max-width: 768px) { .hero { padding: 100px 24px 60px; } .features { padding: 60px 24px; } .features-grid { grid-template-columns: 1fr; } .support { padding: 60px 24px; } footer { padding: 32px 24px; flex-direction: column; text-align: center; } .footer-links { justify-content: center; } }
</style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo"><img src="/brand/logo-horizontal-web.png" alt="DJ&amp;A Digital Studio" class="nav-logo-img"></a>
  <a href="/" class="nav-back">← All Apps</a>
</nav>

<section class="hero">
  <p class="hero-eyebrow">${app.name}</p>
  <h1 class="hero-title">${app.tagline}</h1>
  <p class="hero-sub">${app.heroSub}</p>
  <div class="btn-row">
${app.storeLinksLive === false
    ? `    <span class="btn btn-ghost" style="cursor:default;">Coming Soon</span>`
    : `    <a href="${app.appStoreUrl}" class="btn btn-primary" target="_blank" rel="noopener">App Store</a>\n    <a href="${app.playStoreUrl}" class="btn btn-ghost" target="_blank" rel="noopener">Google Play</a>`}
  </div>
</section>

<section class="features">
  <p class="section-eyebrow">Features</p>
  <div class="features-grid">
${featuresHtml}
  </div>
</section>

<section class="support" id="support">
  <p class="section-eyebrow">Support</p>
  <h2 class="section-title">Common<br><em>Questions.</em></h2>
  <div class="faq">
${faqHtml}
  </div>
  <div class="contact-box">
    <div>
      <p class="contact-label">Still need help?</p>
      <a href="mailto:${COMPANY.supportEmail}" class="contact-email">${COMPANY.supportEmail}</a>
    </div>
    <a href="mailto:${COMPANY.supportEmail}" class="btn btn-ghost">Send a message</a>
  </div>
</section>

${footer({
    appId: app.id,
    legalLinks: [
      ['Privacy', `/privacy/${app.id}/`],
      ['Terms', `/terms/${app.id}/`],
      ['Support', '#support'],
      ['Refund', '/refund.html'],
      ['Data Deletion', '/data-deletion.html'],
      ['EULA', '/eula.html'],
    ],
  })}

</body>
</html>
`;
}

// ---------- retired app landing page (minimal) ----------

function renderRetiredLanding(app) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({
    title: `${app.name} — No Longer Available`,
    description: `${app.name} is no longer available. Existing users can still find support, privacy, and terms information here.`,
    canonical: `${COMPANY.siteUrl}/apps/${app.id}/`,
  })}
<meta name="robots" content="noindex, follow">
<style>
  :root { --black: #080808; --surface: #111111; --border: #222222; --gold: #c9a84c; --gold-light: #e4c87a; --text: #e8e0d0; --text-muted: #8a8070; --text-dim: #847b6c; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--black); color: var(--text); font-family: 'Josefin Sans', sans-serif; font-weight: 300; letter-spacing: 0.04em; min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }
  ${NOISE_BG}
  nav { display: flex; align-items: center; justify-content: space-between; padding: 32px 60px; }
  .nav-logo { text-decoration: none; color: var(--text); font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 400; letter-spacing: 0.05em; }
  .nav-logo span { color: var(--gold-light); font-style: italic; }
  .nav-logo-img { height: 112px; width: auto; display: block; }
  main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; }
  .eyebrow { font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--gold); margin-bottom: 24px; }
  h1 { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.1; margin-bottom: 20px; }
  p { font-size: 0.82rem; line-height: 2; color: var(--text-muted); max-width: 480px; margin-bottom: 8px; }
  a.link { color: var(--gold-light); }
  footer { display: flex; align-items: center; justify-content: center; gap: 24px; padding: 28px 60px; border-top: 1px solid var(--border); }
  .footer-copy { font-size: 0.6rem; letter-spacing: 0.1em; color: var(--text-dim); }
  @media (max-width: 768px) { nav { padding: 24px; } }
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo"><img src="/brand/logo-horizontal-web.png" alt="DJ&amp;A Digital Studio" class="nav-logo-img"></a>
</nav>
<main>
  <p class="eyebrow">${app.name}</p>
  <h1>No longer available</h1>
  <p>${app.name} is no longer available for download. If you were an existing user, its <a class="link" href="/privacy/${app.id}/">Privacy Policy</a> and <a class="link" href="/terms/${app.id}/">Terms of Use</a> remain published, and <a class="link" href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a> still reaches our support team.</p>
</main>
<footer>
  <p class="footer-copy">© 2026 ${COMPANY.legalName}. All rights reserved.</p>
</footer>
</body>
</html>
`;
}

// ---------- legal pages (privacy / terms) ----------

function renderLegalSections(sections) {
  return sections.map(s => {
    const ul = s.ul ? `<ul>\n${s.ul.map(li => `      <li>${li}</li>`).join('\n')}\n    </ul>\n` : '';
    const pBefore = s.p.map(p => `    <p>${p}</p>`).join('\n');
    const pAfter = s.pAfter ? '\n' + s.pAfter.map(p => `    <p>${p}</p>`).join('\n') : '';
    return `  <div class="legal-section">
    <h2>${s.h}</h2>
${pBefore}
${ul}${pAfter}
  </div>`;
  }).join('\n\n');
}

function renderLegalPage({ app, kind, effectiveDate, sections, contactSections }) {
  const { a, aLight, navHover } = accentVars(app.accent);
  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? `Privacy Policy — ${app.name}` : `Terms of Use — ${app.name}`;
  const description = isPrivacy ? `Privacy Policy for ${app.name} by ${COMPANY.tradingName}.` : `Terms of Use for ${app.name} by ${COMPANY.tradingName}.`;
  const pageTitle = isPrivacy ? 'Privacy<br><em>Policy.</em>' : 'Terms of<br><em>Use.</em>';

  const contactSection = `  <div class="legal-section">
    <h2>${sections.length + 1}. Contact Us</h2>
    <p>If you have any questions about this ${isPrivacy ? 'Privacy Policy' : 'document'}, please contact us:</p>
    <p><strong>${COMPANY.legalName}</strong> (trading as ${COMPANY.tradingName})<br>
    Email: <a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a><br>
    Website: <a href="${COMPANY.siteUrl}">djadigitalstudio.com</a></p>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({
    title,
    description,
    canonical: `${COMPANY.siteUrl}/${kind}/${app.id}/`,
  })}
<style>
  :root { --black: #080808; --deep: #0d0d0d; --surface: #111111; --surface2: #161616; --border: #222222; --gold: #c9a84c; --gold-light: #e4c87a; --rose: #c4856a; --rose-light: #d9a08a; --text: #e8e0d0; --text-muted: #8a8070; --text-dim: #847b6c; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: var(--black); color: var(--text); font-family: 'Josefin Sans', sans-serif; font-weight: 300; letter-spacing: 0.04em; overflow-x: hidden; }
  ${NOISE_BG}
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 24px 60px; background: rgba(8,8,8,0.98); }
  .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 400; letter-spacing: 0.05em; }
  .nav-logo span { color: var(--gold-light); font-style: italic; }
  .nav-logo-img { height: 112px; width: auto; display: block; }
  .nav-back { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); text-decoration: none; transition: color 0.3s; }
  .nav-back:hover { color: var(--${navHover}); }
  @media (max-width: 768px) { nav { padding: 20px 24px; } }
  .page-wrap { max-width: 760px; margin: 0 auto; padding: 190px 40px 100px; }
  .page-eyebrow { font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--${a}); margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
  .page-eyebrow::before { content: ''; display: block; width: 24px; height: 1px; background: var(--${a}); }
  .page-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(2.4rem, 5vw, 3.6rem); line-height: 1.1; margin-bottom: 12px; }
  .page-title em { font-style: italic; color: var(--${aLight}); }
  .page-date { font-size: 0.65rem; letter-spacing: 0.15em; color: var(--text-dim); margin-bottom: 60px; }
  .divider { display: flex; align-items: center; gap: 16px; margin-bottom: 60px; }
  .divider-line { flex: 1; height: 1px; background: linear-gradient(to right, var(--${a}), transparent); }
  .divider-diamond { width: 5px; height: 5px; background: var(--${a}); transform: rotate(45deg); flex-shrink: 0; }
  .legal-section { margin-bottom: 48px; padding-bottom: 48px; border-bottom: 1px solid var(--border); }
  .legal-section:last-child { border-bottom: none; }
  .legal-section h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.4rem; color: var(--${aLight}); margin-bottom: 18px; letter-spacing: 0.02em; }
  .legal-section p { font-size: 0.82rem; line-height: 2; color: var(--text-muted); margin-bottom: 14px; }
  .legal-section p:last-child { margin-bottom: 0; }
  .legal-section ul { list-style: none; margin: 14px 0; padding: 0; }
  .legal-section ul li { font-size: 0.82rem; line-height: 2; color: var(--text-muted); padding-left: 18px; position: relative; }
  .legal-section ul li::before { content: '◇'; position: absolute; left: 0; color: var(--${a}); font-size: 0.55rem; top: 0.45em; }
  .legal-section a { color: var(--${aLight}); text-decoration: none; border-bottom: 1px solid rgba(228,200,122,0.3); transition: border-color 0.3s; }
  .legal-section a:hover { border-color: var(--${aLight}); }
  footer { display: flex; align-items: center; justify-content: space-between; padding: 32px 60px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 16px; }
  .footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: var(--text-muted); letter-spacing: 0.05em; }
  .footer-logo span { color: var(--${aLight}); font-style: italic; }
  .footer-copy { font-size: 0.6rem; letter-spacing: 0.1em; color: var(--text-dim); }
  .footer-links { display: flex; gap: 22px; flex-wrap: wrap; list-style: none; }
  .footer-links a { font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-dim); text-decoration: none; transition: color 0.3s; }
  .footer-links a:hover { color: var(--${aLight}); }
  @media (max-width: 768px) { .page-wrap { padding: 120px 24px 80px; } footer { padding: 32px 24px; flex-direction: column; text-align: center; } .footer-links { justify-content: center; } }
</style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo"><img src="/brand/logo-horizontal-web.png" alt="DJ&amp;A Digital Studio" class="nav-logo-img"></a>
  <a href="/apps/${app.id}/" class="nav-back">← ${app.name}</a>
</nav>

<div class="page-wrap">

  <p class="page-eyebrow">Legal · ${app.name}</p>
  <h1 class="page-title">${pageTitle}</h1>
  <p class="page-date">Effective date: ${effectiveDate} &nbsp;·&nbsp; ${COMPANY.legalName}</p>

  <div class="divider"><div class="divider-line"></div><div class="divider-diamond"></div></div>

${renderLegalSections(sections)}

${contactSection}

</div>

${footer({
    appId: app.id,
    legalLinks: [
      ['Privacy', `/privacy/${app.id}/`],
      ['Terms', `/terms/${app.id}/`],
      ['Support', app.status === 'live' ? `/apps/${app.id}/` : '/support/'],
      ['Refund', '/refund.html'],
      ['Data Deletion', '/data-deletion.html'],
      ['EULA', '/eula.html'],
    ],
  })}

</body>
</html>
`;
}

// ---------- home / support card snippets ----------

function renderHomeCard(app) {
  const { a } = accentVars(app.accent);
  const accentClass = app.accent === 'rose' ? ' rose' : '';
  const nameParts = app.name.split(' ');
  const last = nameParts.pop();
  const statusLine = app.storeLinksLive === false
    ? `<p class="app-card-status">◇ Coming Soon</p>`
    : `<p class="app-card-status live">◈ Available Now · iOS &amp; Android</p>`;
  return `    <a href="/apps/${app.id}/" class="app-card" data-app-id="${app.id}">
      ${statusLine}
      <h3 class="app-card-name${accentClass}">${nameParts.join(' ')} <em>${last}</em></h3>
      <p class="app-card-desc">${app.homeCardDesc}</p>
      <span class="app-card-link${app.storeLinksLive === false ? ' muted' : ''}">${app.storeLinksLive === false ? 'Coming soon' : 'Learn more'}</span>
    </a>`;
}

function renderSupportCard(app) {
  const accentClass = app.accent === 'rose' ? ' rose' : '';
  return `    <a href="/apps/${app.id}/#support" class="app-support-card${accentClass}" data-app-id="${app.id}">
      <p class="app-label${accentClass}">${app.name}</p>
      <p class="app-name${accentClass}">${app.name}</p>
      <p class="app-desc">${app.homeCardDesc}</p>
      <span class="app-link${accentClass}">View FAQ →</span>
    </a>`;
}

// ---------- file helpers ----------

function write(relPath, content) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log('  wrote', relPath);
}

function clearGeneratedAppDirs() {
  for (const base of ['apps', 'privacy', 'terms']) {
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
      }
    }
  }
}

function replaceBetweenMarkers(filePath, markerName, newContent) {
  const full = path.join(ROOT, filePath);
  const src = fs.readFileSync(full, 'utf8');
  const start = `<!-- BEGIN:${markerName} -->`;
  const end = `<!-- END:${markerName} -->`;
  const startIdx = src.indexOf(start);
  const endIdx = src.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Markers ${start} / ${end} not found in ${filePath}`);
  }
  const updated = src.slice(0, startIdx + start.length) + '\n' + newContent + '\n  ' + src.slice(endIdx);
  fs.writeFileSync(full, updated);
  console.log('  updated', filePath, `(${markerName})`);
}

// ---------- main ----------

function build() {
  console.log('Building djadigitalstudio.com from apps.config.js...\n');

  const live = APPS.filter(a => a.status === 'live');
  const retired = APPS.filter(a => a.status === 'retired');
  const draft = APPS.filter(a => a.status === 'draft');

  console.log(`${live.length} live, ${retired.length} retired, ${draft.length} draft (draft apps get zero output)\n`);

  clearGeneratedAppDirs();

  for (const app of live) {
    write(`apps/${app.id}/index.html`, renderAppLanding(app));
    write(`privacy/${app.id}/index.html`, renderLegalPage({ app, kind: 'privacy', effectiveDate: app.privacy.effectiveDate, sections: app.privacy.sections }));
    write(`terms/${app.id}/index.html`, renderLegalPage({ app, kind: 'terms', effectiveDate: app.terms.effectiveDate, sections: app.terms.sections }));
  }

  for (const app of retired) {
    write(`apps/${app.id}/index.html`, renderRetiredLanding(app));
    if (app.privacy) write(`privacy/${app.id}/index.html`, renderLegalPage({ app, kind: 'privacy', effectiveDate: app.privacy.effectiveDate, sections: app.privacy.sections }));
    if (app.terms) write(`terms/${app.id}/index.html`, renderLegalPage({ app, kind: 'terms', effectiveDate: app.terms.effectiveDate, sections: app.terms.sections }));
  }

  const navVisible = [...live, ...retired.filter(a => a.showInNav)];

  replaceBetweenMarkers('index.html', 'APPS_GRID', navVisible.map(renderHomeCard).join('\n\n'));
  replaceBetweenMarkers('support/index.html', 'SUPPORT_APPS_GRID', navVisible.map(renderSupportCard).join('\n\n'));

  // sitemap.xml — only live/retired app URLs plus the static hand-authored pages
  const staticPages = [
    ['/', '1.0', 'weekly'],
    ['/support/', '0.7', 'monthly'],
    ['/contact/', '0.6', 'monthly'],
    ['/privacy.html', '0.3', 'yearly'],
    ['/terms.html', '0.3', 'yearly'],
    ['/refund.html', '0.3', 'yearly'],
    ['/data-deletion.html', '0.3', 'yearly'],
    ['/eula.html', '0.3', 'yearly'],
  ];
  const appPages = [];
  for (const app of live) {
    appPages.push([`/apps/${app.id}/`, '0.9', 'monthly']);
    appPages.push([`/privacy/${app.id}/`, '0.4', 'yearly']);
    appPages.push([`/terms/${app.id}/`, '0.4', 'yearly']);
  }
  for (const app of retired) {
    appPages.push([`/privacy/${app.id}/`, '0.3', 'yearly']);
    appPages.push([`/terms/${app.id}/`, '0.3', 'yearly']);
  }
  const urls = [...staticPages, ...appPages]
    .map(([loc, priority, freq]) => `  <url>\n    <loc>${COMPANY.siteUrl}${loc}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`)
    .join('\n');
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

  // robots.txt — nothing to disallow any more; draft apps simply don't exist
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${COMPANY.siteUrl}/sitemap.xml\n`);

  console.log('\nDone. Review the diff, then deploy as usual (drag the folder into Netlify or push if git-connected).');
}

build();
