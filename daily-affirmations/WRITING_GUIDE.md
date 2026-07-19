# Writing Guide — DJ&A Daily Affirmations

Read `BRAND_VOICE.md` first. This document is the craft: exactly how a script gets written, beat
by beat, sentence by sentence, so it reads as a real person talking, not a generated affirmation.

The code that implements this guide lives in `src/server/ai-services/scriptWriter.ts` (the
five-beat structure) and `src/server/config/brands.ts` (the tone rules and banned phrases, one set
per brand). If you change the creative direction, update both this document and that code —
neither should drift ahead of the other.

## Stop writing affirmations. Write cinematic emotional monologues.

A generic affirmation states a feeling and offers a platitude. A cinematic emotional monologue
*moves through* a feeling with someone, in real time, the way an actual conversation would. Every
script follows the same five beats, in order, as one continuous piece — never labeled, never
announced, just felt.

### 1. Emotional recognition (the first five seconds)

Open with something immediately, specifically relatable. The listener's very first reaction should
be *"this is about me,"* not *"here comes a speech."*

> "I know that look."
> "I remember driving home in complete silence."
> "I don't know exactly what happened today... but I know what it feels like when your heart is
> heavier than your body."

### 2. Validation

**Do not rush into encouragement.** Sit with the emotion. Let the listener feel understood before
you offer anything at all. This is the beat most scripts skip, and skipping it is what makes an
affirmation feel hollow — comfort that arrives before validation reads as fake, because it is.

> "We carry things that nobody else sees."
> "Sometimes the hardest part isn't the shift... it's trying to leave it behind."

### 3. Shared experience

First person — "we," "I've," "I still," "I remember" — because the narrator genuinely belongs to
this, not as a writing technique. **But never claim certainty about the listener's specific
day.** You can only be certain of your own experience and the feeling you recognize in
theirs — not the specifics of what actually happened to them today. This is the single most
important authenticity rule in the whole brand; see the table below.

### 4. Gentle comfort

Reassurance without pretending to solve everything. Never *"everything will be okay"* — that's a
promise the narrator can't actually make, and making it breaks trust instantly.

> "You don't have to carry today by yourself."
> "You deserved kindness today too."

### 5. Hope

End quietly. Never *"you've got this!"* — that's a cheer, not comfort, and it ends the moment on
the narrator's energy instead of the listener's.

> "Tomorrow will come. When it does... we'll keep going together."
> "If today was heavy... please remember... you're not carrying it alone."

## The certainty rule (read this twice)

Because every script speaks as a fellow nurse or fellow autism parent, it's tempting to claim
total understanding up front. Don't. No two shifts are the same. No two families' days are the
same. Claiming to know a stranger's exact experience is a small, avoidable act of
inauthenticity — and it's exactly the kind of thing a real nurse or real parent would notice and
distrust immediately, which undoes the entire point of the brand.

**Share the feeling. Never claim certainty about their specific experience.**

| Instead of | Prefer |
|---|---|
| "I know exactly what you're feeling." | "I don't know exactly what today looked like for you, but I know what it's like when a shift stays with you." |
| "I know exactly what you're going through." | "Our journeys aren't all the same, but there are moments many of us recognize — the exhaustion, the fierce love, and the hope we keep holding onto." |

This is enforced in code two ways: `brands.ts`'s `toneRules` state the rule explicitly with these
exact examples, and `UNIVERSAL_BANNED_PHRASES` blocks the most common literal violations ("I know
exactly what you're feeling," etc.) as a backstop. But a backstop only catches exact phrasing —
the *rule itself*, understood, is what actually prevents every other way of saying the same wrong
thing.

## Sentence rhythm

Real speech doesn't march in matched clauses. Vary sentence length on purpose: mix one short,
blunt sentence with longer, more textured ones. Use natural pauses — commas, dashes, ellipses —
the way someone speaking slowly, thinking as they go, actually talks. This isn't decoration; it's
what the subtitle timing and the voice pacing (see `VISUAL_GUIDE.md`) are built to breathe around.

**Avoid** the "AI tell": three parallel clauses in a row ("You are brave. You are strong. You are
enough."), list-like structure, or a script that could be reordered without losing anything. If
every sentence has the same shape, it reads as generated, no matter how nice the words are.

## Words and phrasing to use

- First person: "I," "we," "I've," "I still," "I remember" — the plain truth of who is speaking.
- One concrete, specific, sensory detail per script (a smell, a sound, a small gesture) — see the
  brand-specific style guides for exactly what that detail should be for each series.
- Quiet, restrained language. Confidence without volume.

## Words and phrasing to avoid — universal

These are hard-blocked in code (`UNIVERSAL_BANNED_PHRASES` in `brands.ts`) because they are the
clichés and toxic-positivity tells that make content feel generic, AI-generated, or dismissive of
how hard the day actually was:

> everything happens for a reason · good vibes only · you got this · self-care isn't selfish ·
> live laugh love · when god closes a door · what doesn't kill you makes you stronger · just
> breathe · it is what it is · positive vibes · manifest your · the universe has a plan ·
> everything will fall into place · trust the process · be grateful for what you have · in the end
> it will all be worth it · other people have it worse · at least · look on the bright side · stay
> strong · one day at a time · this too shall pass · you are not alone · be kind to yourself · you
> deserve rest · take it one step at a time · you are stronger than you think · better days are
> coming · progress not perfection · you are exactly where you need to be · everything will be
> okay · I know exactly what you're feeling / going through

Plus no emojis, no quotation marks around the whole script, never quote famous people or use a
quotation format, never plagiarize or lightly reword a known quote/song lyric/slogan.

See `NURSE_STYLE_GUIDE.md` and `AUTISM_PARENT_STYLE_GUIDE.md` for the additional phrases banned
per brand, and why each one specifically causes harm in that context.

## Length and pacing

45-85 words, meant to be spoken slowly and gently at roughly 110-130 words per minute (see
`VISUAL_GUIDE.md` for the voice delivery direction) — around 20-45 seconds of audio. This is wider
than a typical short-form script because the five-beat structure needs room to actually move
through a feeling rather than compressing everything into a single line.

## The final test, before anything ships

Two questions, both hard gates in the pipeline (`src/server/ai-services/emotionalJudge.ts`) — a
"no" on either one forces the script to be rewritten, regardless of how well it scores on
anything else:

1. **Believability** — would an experienced ICU nurse genuinely believe another nurse wrote this
   (not a wellness brand, not an AI)? Would an autism parent genuinely believe another autism
   parent wrote this (not an advocacy account, not an AI)?
2. **Save-worthy** — would someone actually save this video, or send it to a friend, because it
   made them feel understood? This is the metric social media actually rewards — people don't
   save content because it's well written, they save it because it spoke to them specifically.
   A script can be believable as a peer's voice and still not be worth saving if it doesn't land
   emotionally; both questions have to clear the bar.

See `AUDIENCE_PROFILES.md` for the specific psychology each of these questions is really testing
against — "would this person, exactly as described there, save this?"

## Excellent vs. weak — worked examples

### Excellent (Nurse, Burnout)

> "I know that look. The ride home too quiet, the scrubs still smelling like the unit. I don't
> know exactly what tonight cost you, but I know what it's like when a shift doesn't let go at the
> door. We carry things nobody else sees — a name we won't forget, a kind of tired sleep doesn't
> touch. You don't have to leave it behind right now. Sit in the car a minute if you need to.
> Tomorrow will come. When it does, we'll keep going together."

*Why it works:* opens on a specific, sensory image (quiet ride, scrub smell) — beat 1. Sits with
the weight before offering anything — beat 2. Shares the feeling without claiming to know her
specific night — beat 3, certainty rule respected. Comfort that doesn't promise anything —
beat 4. Ends quiet, not triumphant — beat 5. Varied sentence length throughout. Would an ICU nurse
believe a colleague wrote this? Yes.

### Weak (Nurse, same topic — do not do this)

> "Hey there, amazing nurse! 💙 I know exactly what you're going through today. You are a hero and
> you got this! Every day you show up and make a difference. Remember: you are stronger than you
> think, and better days are coming. Take it one step at a time — self-care isn't selfish, and you
> deserve rest. Stay strong, you've got this!"

*Why it fails:* emoji; opens by claiming exact knowledge of her day (certainty rule violated);
"hero" language the Nurse guide specifically bans; five separate banned clichés
("you got this," "stronger than you think," "better days are coming," "one step at a time,"
"self-care isn't selfish," "you deserve rest," "stay strong"); no concrete sensory detail anywhere;
skips validation entirely and goes straight to a cheer; ends triumphant instead of quiet. An ICU
nurse would recognize this as a generic wellness-brand template in the first sentence.

### Excellent (Autism Parent, Hard Days)

> "I know that pause before you open the front door, bracing for whatever tonight is going to be.
> Our journeys aren't all the same, but there are moments many of us recognize — the meltdown that
> came out of nowhere, the exhaustion underneath a love you'd never trade. You held the room
> together today, even when nothing was working. You don't have to have it figured out by
> morning. Some days just need surviving, and you survived it. Tomorrow will come. When it does,
> we'll keep going together."

*Why it works:* specific physical detail (the pause at the door) — beat 1. Names the exhaustion
and the love together without rushing past either — beat 2. Uses the exact certainty-rule phrasing
from `BRAND_VOICE.md` — beat 3. Comfort that doesn't demand anything ("just need surviving") —
beat 4. Quiet close — beat 5.

### Weak (Autism Parent, same topic — do not do this)

> "Hey supermom! 🌈 I know exactly what you're going through raising your special angel. Everything
> happens for a reason, and your autism warrior is exactly where they need to be! You are a
> superhero and you've got this! Stay strong, mama — at least you have each other. Better days are
> coming!"

*Why it fails:* emoji; claims exact knowledge of her day; "special angel" and "autism warrior" —
both specifically banned inspiration-porn language; "everything happens for a reason" (toxic
positivity, also implies the hard day was somehow deserved/meaningful in a way that can read as
dismissive); centers the child as an inspirational object instead of the parent's actual
experience; "at least" minimizes; ends on a hyped cheer instead of quiet comfort. An autism parent
would recognize this as generic inspiration content, not a peer.
