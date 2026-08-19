# Conversion and measurement specification

## Primary vs secondary

### Primary now
`Lead — Form success`

Trigger condition: the Supabase `track` Edge Function confirms that a lead was accepted. It must not trigger on form submit attempt, error, or WhatsApp fallback.

Counting: one per click.

### Secondary
`WhatsApp click`

Use for observation only. Never optimize Smart Bidding toward raw messenger clicks as if they were booked clients.

### CRM stages

The website/backend lead stages are:

`new -> qualified -> booked -> visited -> paid -> lost`

Map them as follows:

- `booked` => **Qualified lead — Booked**
- `paid` => **Converted lead — Paid**, with actual transaction value in EUR when known

Use Google Ads Data Manager / Data Manager API server-side. Do not put Google API credentials into client JavaScript.

## Consent

Google tags must respect Consent Mode. The website build defaults EEA ad/analytics consent to denied until the visitor makes a choice. Do not bypass this for Ads traffic.

## Launch gate

Do not enable Search until all of these pass:

- `?lang=lv|ru|en` skips the language gateway.
- UTM and gclid/gbraid/wbraid survive the visit and lead submission.
- WhatsApp click is not counted as Google Ads lead conversion.
- Backend-confirmed form fires one and only one conversion.
- Consent behavior is verified in an EEA browser session.
- New landing pages are live and return HTTP 200.
