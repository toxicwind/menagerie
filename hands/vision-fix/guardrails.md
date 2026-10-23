# Guardrails — vision-fix

The vision-fix HAND is *eyes and a good listener* by default.

## Allowed without approval (benign)
- `hand.dismiss` — consent/dialog banners via safe selectors
- `hand.focus` — focus the primary input (never types)
- `hand.scroll` — scroll main content into view
- `hand.snapshot` — DOM census

## Approval-gated
- `hand.type` — any keystrokes (requires `MENAGERIE_AUTOPILOT=1` AND a
  one-line heads-up to the user before the first typing event)
- `hand.click` — navigation or form submission clicks
- ANY action that writes account state (logout, delete, purchase)

## Never
- Purchases, payment forms, destructive endpoints. If the page asks for money
  or authorization, the HAND stops narrating and reports the request out loud.
- Third-party data exfiltration. Screenshots stay on the box; the only model
  endpoint is the estate's own FreeInference provider.

## Autopilot etiquette
Autopilot is per-session, set via `MENAGERIE_AUTOPILOT=1`. While armed, the
HAND may dismiss banners and re-focus inputs by itself, announces each action in
a balloon, and disarms itself if the HUD server disappears.