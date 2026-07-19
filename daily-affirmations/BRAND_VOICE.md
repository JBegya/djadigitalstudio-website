# Brand Voice — DJ&A Daily Affirmations

This document is the creative foundation for everything this application produces. Read it before
changing a prompt, a visual, a piece of music, or a line of copy.

**Optimize for emotional impact first, while remaining economically sustainable.** When a
technical decision and an emotional one conflict, default to the emotional one — spending a few
extra cents per video for noticeably better writing or narration is worth it if it improves how
understood a viewer feels. But this isn't a blank check: if a change would multiply the cost of a
video several times over for only a marginal quality gain, that's worth stopping and reassessing
rather than assuming the emotional argument always wins by default. The creative vision stays
front and center without losing sight of the business it needs to sustain.

## The one job this application has

Someone has just finished one of the hardest days of their life.

They open Facebook Reels or TikTok.

They find one of our videos.

For the first time today...

they feel understood.

That's it. That's the whole product. Every script, every voice, every frame of footage, every
beat of music, every quality check exists to make that one moment happen as reliably and as
genuinely as possible. If a change makes the pipeline faster, cheaper, or more "elegant" but makes
that moment less likely to happen, the change is wrong.

## What this is — and what it is not

**DJ&A Daily Affirmations is an emotional companion. It is not a motivational app.**

The person watching should never feel like they are listening to:

- an AI
- a motivational speaker
- a therapist
- a life coach
- a narrator
- an influencer

They should feel like they are listening to **someone exactly like them** — a fellow nurse, a
fellow autism parent — who has genuinely lived this and is sitting quietly beside them after a
hard day.

When they finish watching, they should think one of these three things:

- *"This person understands me."*
- *"I am not alone."*
- *"Someone else has carried this too."*

That emotional connection — not view count, not motivation, not polish — is the primary measure
of success for this application.

## The narrator, in one sentence

**The narrator IS the audience, one day ahead of them tonight.** Not an outside observer
describing their experience. Not an expert who studied it. Someone who lives it, writing to
someone else who lives it too, the way you'd actually talk to a close friend at the end of a
terrible day — quietly, without performing anything.

See `NURSE_STYLE_GUIDE.md` and `AUTISM_PARENT_STYLE_GUIDE.md` for exactly who that narrator is for
each series — their backstory, their specific vocabulary, and what they would never say.

Knowing who's speaking isn't enough on its own — see `AUDIENCE_PROFILES.md` for who's
**listening**: not demographics, but the specific psychology of the person opening this video at
the end of a hard day — what she fears, what she secretly needs, what words hurt and which ones
heal. A script that nails the narrator's voice but doesn't actually meet the listener where she is
will still fall flat.

## The one rule that protects authenticity above all others: don't claim certainty you don't have

Because every script is written from the perspective of a fellow nurse or a fellow autism parent,
it is tempting to open with certainty: *"I know exactly what you're feeling."* **Don't.** No two
shifts are the same. No two families' days are the same. Claiming to know a stranger's specific
experience is itself a small act of inauthenticity — the exact thing this whole brand exists to
avoid — and a real nurse or real parent would notice it immediately.

Share the **feeling** you recognize. Never claim certainty about **their specific experience.**

| Instead of (claims certainty) | Prefer (shares the feeling, not the certainty) |
|---|---|
| "I know exactly what you're feeling." | "I don't know exactly what today looked like for you, but I know what it's like when a shift stays with you." |
| "I know exactly what you're going through." | "Our journeys aren't all the same, but there are moments many of us recognize — the exhaustion, the fierce love, and the hope we keep holding onto." |

This distinction is now encoded directly in the generation code, not just in this document — see
`src/server/config/brands.ts`'s `toneRules` (the explicit rule, with these exact examples) and
`src/server/ai-services/scriptWriter.ts`'s `MONOLOGUE_STRUCTURE` (beat 3, "Shared experience").
This file exists so the *reasoning* behind that code survives independently of it — anyone
touching the prompts later should understand *why* this rule exists, not just that it does.

## Brand personality

Every narrator, every frame, every note of music should feel:

**Warm · Gentle · Patient · Calm · Emotionally mature · Compassionate · Hopeful · Authentic**

Never: preachy, dramatic, fake, exaggerated, overly positive, or "motivational."

Imagine the narrator sitting beside the listener after one of the hardest days of their life.
That image is the test for every decision in this document.

## Design inspiration

**Apple, Headspace, Calm, Notion.** Borrow their restraint, their whitespace, their quiet
confidence, their refusal to shout. Don't borrow corporate slickness or over-polish — a video that
looks too produced reads as inauthentic, which is the opposite of the goal.

## Shared visual identity

Nurse Affirmations and Autism Parent Affirmations are two series under one studio identity — the
same monogram, the same typography, the same intro/outro structure — with a distinct accent per
series so a viewer can tell them apart at a glance without either one feeling like a different
brand. See `VISUAL_GUIDE.md` for the full palette, typography, and motion language.

- **Deep Charcoal** `#121212` — background
- **Soft Warm White** `#F8F8F6` — primary text
- **Muted Gold** `#C9A227` — subtle accents only, never a dominant color
- **Soft Sage Green** `#A8C3A0` — Autism Parent accent (hope, healing, warmth)
- **Dusty Blue** `#7F9FBF` — Nurse accent (calm, reassurance, clinical cool)

## The documents in this Brand Bible

| Document | What it covers |
|---|---|
| `BRAND_VOICE.md` (this file) | The mission, the narrator concept, the personality, the one rule that protects authenticity |
| `WRITING_GUIDE.md` | The five-beat script structure, sentence rhythm, words to use/avoid, excellent vs. weak examples |
| `VISUAL_GUIDE.md` | Color, typography, motion, subtitles, music — the shared visual/audio language of both series |
| `NURSE_STYLE_GUIDE.md` | Everything specific to writing and shooting as a nurse, for nurses |
| `AUTISM_PARENT_STYLE_GUIDE.md` | Everything specific to writing and shooting as an autism parent, for autism parents |
| `AUDIENCE_PROFILES.md` | Who's listening — the psychology of the person on the other side of the screen, not just who's speaking to them |

These documents are the creative foundation. When the code and this document disagree, that's a
bug in the code — fix the code, or have a real conversation about changing the direction here
first. Don't let the prompts drift away from what's written here without updating both.
