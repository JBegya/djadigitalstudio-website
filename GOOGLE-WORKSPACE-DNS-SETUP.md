# Google Workspace + DNS Setup — djadigitalstudio.com

This is a manual runbook. I can't sign up for Google Workspace, enter payment
details, or edit DNS at Namecheap on your behalf — those all require your own
login. Follow these steps in order; each DNS section tells you exactly what
to paste into Namecheap's Advanced DNS tab.

**Verified, not assumed** — I looked this up directly with `whois` and `dig`
rather than guessing:

- **Registrar & DNS host: Namecheap.** Nameservers are `dns1/dns2.registrar-servers.com`
  (Namecheap's own default nameservers), so DNS is managed in Namecheap's own
  **Advanced DNS** tab — it isn't delegated to Cloudflare or anyone else.
- **Website host: Netlify — and it's already live.** `djadigitalstudio.com`
  currently resolves to Netlify site `golden-dieffenbachia-7d3770.netlify.app`
  (IP `54.253.94.210`), and returns `HTTP 200`. Note: the *content* live there
  right now is whatever was last manually deployed (the `website-deploy.zip`
  in your Downloads folder, most likely) — none of the edits from this session
  are published yet. You'll need to redeploy for any of this work to go live
  (drag the `website` folder into Netlify's dashboard, or connect it to a git
  remote — see the note at the end of this doc).

---

## 0. Fix this first — apex domain has a raw CNAME, which blocks Google Workspace

This is the one thing that will silently break everything else if you skip it.

`dig djadigitalstudio.com ANY` shows:

```
djadigitalstudio.com.   IN   CNAME   golden-dieffenbachia-7d3770.netlify.app.
```

That's a **literal CNAME record at the root domain (`@`)**. Per DNS rules
(RFC 1034 §3.6.2), a name that has a CNAME record **cannot have any other
record at that same name** — no MX, no TXT for SPF or site-verification,
nothing. As long as this record stays a CNAME, Google Workspace's MX and TXT
records physically cannot coexist with it, and mail for `@djadigitalstudio.com`
will not work.

**Double-checked, not just my first read:** I re-ran `dig djadigitalstudio.com ANY`
independently before writing this revision — same result, still a literal
CNAME, nothing has changed on the live site. I also checked Namecheap's own
documentation rather than relying on memory:

- Namecheap's ALIAS record support: ["How to create an ALIAS record"](https://www.namecheap.com/support/knowledgebase/article.aspx/10128/2237/how-to-create-an-alias-record/) — confirms ALIAS is a real option in the Advanced DNS **Type** dropdown, available on all Namecheap DNS plans (BasicDNS/FreeDNS/PremiumDNS), and explicitly states an ALIAS record **can coexist with other records set for the same host** (unlike CNAME) — which is exactly what MX/TXT/Google Workspace needs.
- Namecheap's own record-type guide: ["Which record type option should I choose?"](https://www.namecheap.com/support/knowledgebase/article.aspx/579/2237/which-record-type-option-should-i-choose-for-the-information-im-about-to-enter/) confirms the general DNS rule that a CNAME cannot coexist with any other record type at the same host.

**One important sequencing note straight from Namecheap's docs:** *"Before creating an ALIAS record, please check there are no CNAME, URL Redirect (Unmasked/Masked/Permanent), A or AAAA records set for the same Host."* In other words, Namecheap won't let the ALIAS and the old CNAME exist even momentarily — you must fully delete the CNAME first, let that save, and only then add the ALIAS. Doing it in the wrong order (or trying to add both in the same page load without saving in between) is the most common way this goes wrong.

**Fix (5 minutes, do this before anything else, and in this exact order):**

1. Namecheap → Domain List → **Manage** → **Advanced DNS**.
2. Also check the **Domain** tab's "Redirect Domain" section while you're there — if there's a legacy URL redirect configured on the apex outside of Advanced DNS host records, that can also conflict. There's no evidence of one from the outside (the CNAME is clearly what's serving the site), but it's worth a 10-second look since you're already in there.
3. Find the record: Host `@`, Type **CNAME Record**, Value `golden-dieffenbachia-7d3770.netlify.app`.
4. **Delete it, and save.** Confirm it's gone before moving on — don't add the next record in the same action.
5. Add a new record: Host `@`, Type **ALIAS Record**, Value `golden-dieffenbachia-7d3770.netlify.app` (same target as before), save.

This is a low-risk change — the ALIAS resolves to the exact same Netlify site the CNAME did, so visitors and the live app see no difference. The only thing that changes is that MX/TXT records become legal to add alongside it. There will be a brief window (seconds to a few minutes, depending on DNS caching) between deleting the CNAME and the ALIAS taking effect where the domain may not resolve — plan this for a quiet moment, not mid-launch.

Give it a few minutes to propagate, then confirm with:
```
dig djadigitalstudio.com ANY
```
You should see an `A` record (not `CNAME`) once it's switched. Also re-check
`curl -I https://djadigitalstudio.com/` returns `HTTP/2 200` afterward to
confirm the live site wasn't affected.

---

## 1. Sign up for Google Workspace

1. Go to `workspace.google.com` → Get Started.
2. Enter business name: **DJ&A Digital Studio Limited**.
3. Number of employees: 1 (you can add more later).
4. Enter your existing email for account recovery (not an @djadigitalstudio.com one yet).
5. When asked for a domain, choose **"I already own one"** and enter `djadigitalstudio.com`.
6. Google will ask you to verify domain ownership — it gives you a **TXT record** (or sometimes an HTML file / meta tag option; choose the **TXT record** method, it's the most reliable for a static Netlify site).

### DNS record — domain verification

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `@` | *(the exact string Google shows you, starts with `google-site-verification=...`)* | Automatic |

Add it in Namecheap, then go back to the Workspace setup wizard and click **Verify**. This can take a few minutes to a few hours to propagate — if verification fails immediately, wait 15 minutes and retry.

7. Pick a plan (Business Starter is enough to start) and enter billing details **yourself** in the Workspace admin console — I can't do this step.

---

## 2. MX records (mail routing)

Once the domain is verified, Google will show you MX records to add. As of the current Gmail setup, Google uses a **single simplified MX record**:

| Type | Host | Value | Priority | TTL |
|---|---|---|---|---|
| MX | `@` | `smtp.google.com` | `1` | Automatic |

If the Workspace admin console shows a different/older-style set of multiple MX records (`ASPMX.L.GOOGLE.COM` etc.) instead of the single `smtp.google.com` record, use whatever the admin console displays at the time — Google occasionally updates the recommended set, and the console is always the source of truth over any static guide.

---

## 3. SPF (Sender Policy Framework)

SPF tells other mail servers which servers are allowed to send mail *as* your domain — this stops spoofing and keeps your mail out of spam folders.

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | Automatic |

If a TXT record already exists at `@` with a different SPF string, **merge them into one** — you can only have one SPF record per domain. `~all` means "soft fail" (mark as suspicious but don't hard-reject) — appropriate while everything is new. You can move to `-all` (hard fail) after a few weeks once you've confirmed all your legitimate senders (Google Workspace, and later RevenueCat/support tooling if it ever sends mail as your domain) are included.

---

## 4. DKIM (DomainKeys Identified Mail)

DKIM cryptographically signs outgoing mail so receivers can verify it wasn't tampered with. This is a **two-step process** — Google generates the key only after Workspace is active:

1. In the Workspace Admin console: **Apps → Google Workspace → Gmail → Authenticate email**.
2. Select `djadigitalstudio.com`, click **Generate new record**.
3. Google gives you a Host (something like `google._domainkey`) and a long TXT value starting with `v=DKIM1; k=rsa; p=...`.

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `google._domainkey` | *(the long key Google generates — copy it exactly, including quotes if Namecheap requires them for long strings)* | Automatic |

4. Back in the Admin console, click **Start authentication** once the record is live (DNS can take up to 48 hours, usually much faster).

---

## 5. DMARC (Domain-based Message Authentication)

DMARC tells receiving servers what to do with mail that fails SPF/DKIM, and gives you visibility via aggregate reports.

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@djadigitalstudio.com; fo=1` | Automatic |

- `p=quarantine` — failing mail goes to spam rather than being silently accepted (a safe starting point).
- `rua=mailto:admin@djadigitalstudio.com` — you'll get periodic aggregate reports here showing who's sending mail as your domain.
- After a few weeks of clean reports, tighten it to `p=reject` for maximum protection against spoofing:
  `v=DMARC1; p=reject; rua=mailto:admin@djadigitalstudio.com; fo=1`

---

## 6. Create the mailboxes

You've already created four mailboxes in the Workspace Admin console: `jennie@`, `hello@`, `support@`, `admin@`. The website only references these four — I'm not assuming or referencing any others (`privacy@`, `legal@`, `noreply@`, etc.) until you've actually created them.

| Address | Used for on the website |
|---|---|
| `jennie@djadigitalstudio.com` | Your primary login |
| `hello@djadigitalstudio.com` | General enquiries (Contact page) |
| `support@djadigitalstudio.com` | Support, bug reports, feature requests, and the public contact address in the Privacy Policy, Terms, EULA, and Support page |
| `admin@djadigitalstudio.com` | Business/billing/refund enquiries (Refund Policy) |

If you'd rather keep them visually separate in your inbox (e.g. auto-label), use Gmail filters: **Settings → Filters → Create a filter** → `To: support@djadigitalstudio.com` → Apply label "Support".

**If you later want to split these out further** (e.g. a dedicated `privacy@` for GDPR/data requests, or `noreply@` as the From address for the automated templates in `/email-templates`), that's a reasonable next step as the business grows — just say the word and I'll create the alias and wire the corresponding pages to it. Nothing on the site references them until they exist.

---

## 7. Anti-spam & mailbox security best practices

- **Turn on 2-Step Verification** for `jennie@djadigitalstudio.com` (Admin console → Security → 2-Step Verification → enforce for all users). This is the single highest-impact security step for a Workspace account.
- **Enable Google's spam/phishing protections**: Admin console → Apps → Gmail → Safety → turn on enhanced pre-delivery message scanning and "Protect against incoming spoofing emails that pass authentication checks."
- **Register with Google Postmaster Tools** (`postmaster.google.com`) for djadigitalstudio.com — gives you visibility into spam rate, domain reputation, and delivery issues once you're sending real volume (e.g. transactional emails from the templates in `/email-templates`).
- **Don't set up a catch-all address** (an address that accepts mail to *any* unrecognized `@djadigitalstudio.com` address). It's a common target for spam/backscatter. Stick to the seven defined mailboxes/aliases above.
- **Never publish DKIM private keys** anywhere (they stay inside Google's infrastructure — you only ever handle the public key TXT record above).

---

## 8. The website's DNS (Netlify) — already connected

Unlike email, this part is **already working** — `djadigitalstudio.com` and
`www.djadigitalstudio.com` both resolve to your Netlify site
(`golden-dieffenbachia-7d3770.netlify.app`) right now. The only action here is
the CNAME → ALIAS fix in Step 0; nothing else needs to change for the domain
connection itself.

To actually publish the changes made in this session, either:
- Drag-and-drop the `website` folder onto your Netlify site's **Deploys** tab (manual deploy, same as your last `website-deploy.zip`), or
- Push this folder to a GitHub repo and connect Netlify to it for automatic deploys on every future change (recommended for the long run — ask me and I can set up the repo side, though connecting it to Netlify and authorizing GitHub access needs your login).

---

## 9. Search engine verification (Search Console / Bing Webmaster)

Both require signing in with your own Google/Microsoft account, so I can't do this step, but the mechanism is simple:

- **Google Search Console** (`search.google.com/search-console`): add property → choose "Domain" (not "URL prefix") → it gives you a TXT record, same pattern as Workspace verification. Add it as another TXT record at `@` (you can have multiple TXT records at the same host, unlike CNAME — this is fine alongside SPF). Once verified, submit `https://djadigitalstudio.com/sitemap.xml` under **Sitemaps**.
- **Bing Webmaster Tools** (`bing.com/webmasters`): easiest path is "Import from Google Search Console" once the above is done — it reuses the same verification, no extra DNS record needed.

---

## 10. Verification checklist

After adding everything, confirm with these free tools:

- **Apex record type**: `dig djadigitalstudio.com ANY` → should show `A`, not `CNAME`
- **MX**: `dig MX djadigitalstudio.com` (or mxtoolbox.com) → should show `smtp.google.com`
- **SPF**: mxtoolbox.com/spf.aspx → should show `v=spf1 include:_spf.google.com ~all`
- **DKIM**: send yourself a test email from `jennie@djadigitalstudio.com` to a Gmail account, open "Show original" → should show `dkim=pass`
- **DMARC**: mxtoolbox.com/dmarc.aspx → should show your `p=quarantine` (or `p=reject`) record
- **Site**: djadigitalstudio.com should resolve to the Netlify-hosted site over HTTPS with a valid certificate (already true today)

Typical end-to-end propagation time: minutes to a few hours; DNS can technically take up to 48 hours to fully propagate worldwide.
