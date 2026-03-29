# TOOLS.md - Resend Email

## Jay Identity
**Email:** `jay@anderro.com` — default sending address for ALL projects (not just Anderro)
**Alternatívy:** `support@`, `hello@`, `assistant@` — všetko @anderro.com

## Odosielanie emailov
**Status:** ✅ Funkčné
**Doména:** anderro.com (sending enabled, receiving disabled)
**SDK:** Resend Node.js v6.9.2

### Použitie
```javascript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'jay@anderro.com',  // alebo onboarding@resend.dev pre testy
  to: ['recipient@example.com'],
  subject: 'Subject',
  text: 'Body',
  html: '<p>HTML body</p>'
});
```

## Prijímanie emailov
**Status:** ❌ Nie je nastavené
**Problém:** Doména anderro.com má receiving disabled

### Čo treba urobiť:
1. **Možnosť A:** Použiť Resend-managed domain (rýchlejšie)
   - Adresa: `jay@<id>.resend.app`
   - Nastaviť v Resend dashboarde → Emails → Receiving
   
2. **Možnosť B:** Kúpiť novú doménu pre receiving
   - Napr. `askjay.io`, `jaybot.com`, atď.
   - Nastaviť MX záznamy

### Architektúra prijímania:
```
Odosielateľ → Email → Resend (MX) → Webhook → https://jay.infinee.pro/webhook/resend → Jay
```

### Security levels (podľa agent-email-inbox skill):
- **Strict allowlist** — len trusted odosielatelia
- **Domain allowlist** — napr. len @gmail.com, @infinee.pro
- **Content filtering** — spam detection, attachment scanning
- **Sandboxed processing** — izolované spracovanie

## Webhooks
**Status:** ❌ Žiadne webhooky nie sú nastavené
**Potrebné:** RESEND_WEBHOOK_SECRET na overenie webhookov

## Kontakty a Audiences
- **Audience:** General (id: 909f2cfa-9dd3-4122-891f-58ec090f0f6f)
- **Kontakty:** 0 (prázdne)

## API kľúč
**Env:** RESEND_API_KEY ✅ nastavený
**Funkčnosť:** ✅ Testované — odosielanie, list domén, contacts
