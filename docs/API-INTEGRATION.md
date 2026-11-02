# API integration — 0.4.1

## Layout and design

Use the official Pleos Connect Asta Sans font, neutral color tokens, 48px touch controls and icon-led blocks. See [the current design system](PLEOS-DESIGN.md). Desktop reference: 1440px; mobile: 375px. No permanent right sidebar.

### Touch-first revision

The user's subsequent requirement is touch-only routine configuration with recognizable blocks. Primary flow: choose a category tile → choose a named function block → adjust large controls → apply. Do not require API identifiers, JSON, property paths, typed enum names or coordinate strings. Use segmented choices, seat-position tiles, steppers, sliders and an on-screen numeric pad. Text actions offer ready-made phrases and optional phone-style text input. Responses are labelled values; complex response fields are selected from a tree after a read. Keep technical diagnostics out of the primary editor. The existing Vehicle/Connect adapters remain the execution layer.

## Implementation contract

Start methods, common watched signals and expression kinds use icon cards instead of native selects. Each start method retains its own draft while switching. The monitoring entry point is a labelled icon card, with an explicit selected check and foreground-only scope. The launcher and favicon use the existing two-dot Routines path mark.

The native bridge accepts only catalogued IDs and typed arguments. It never accepts class names, arbitrary method names or executable code from imported routines. Catalog definitions are generated from the installed public SDK declarations. Deprecated(ERROR) operations are not executable. Prefer current capability overloads and AAOS replacements for deprecated vehicle properties.

Vehicle responses, errors, unsupported features and permission denials remain distinct from simulated values. A successful subscription call means listener registration returned; it does not prove an event was received. Writes run only from an explicitly invoked flow or an armed foreground event flow. Leaving the app, stopping monitoring or changing routines removes subscriptions. No background automation is implied.

The full developer build declares the permissions needed by the catalog. Vehicle support and store permission approval remain environment-specific. An APK build or a catalog coverage check is not proof that all vehicle features are implemented by an emulator or production vehicle.
