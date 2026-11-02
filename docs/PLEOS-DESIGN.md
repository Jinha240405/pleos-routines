# Pleos Connect visual system

Reference reviewed 2026-11-02: running Pleos Connect emulator and official 2.1.5 design foundations.

- [Overview](https://document.pleos.ai/docs/connect/guide/docs-design/Introduction/intro)
- [Typography](https://document.pleos.ai/docs/connect/guide/docs-design/foundations/typography): system font **Asta Sans**; main content at least 18px. Bundled locally using Fontsource (OFL-1.1), original authors 42dot. No network font loading.
- [Colors](https://document.pleos.ai/docs/connect/guide/docs-design/foundations/colors): #FFFFFF, #F7F8FA, #EDEEF2, #E0E1E6, #686A72, #44464E, #131417. Blue is the app's selected/control accent, not a claimed official raw color token.
- [Iconography](https://document.pleos.ai/docs/connect/guide/docs-design/foundations/contents-creation/iconography): 48dp base grid, outline/filled variants, familiar symbols with labels. This implementation uses locally bundled Lucide outline SVGs (ISC), with consistent weight and optical size. These are not claimed to be extracted proprietary OS icons.
- Official downloadable Figma reference: https://document.pleos.ai/img/Pleos_Connect_design_assets_215.fig

Layout before implementation: restrained white shell, neutral gray canvas, one central routine flow, no permanent right rail. Large icon/category tiles open named action blocks. The block's settings show the selected function first, then location tiles, choices, and numeric steppers/keypad. Selection uses a blue outline plus a checkmark; meaning never relies on color alone. Dialog footer remains visible while scrolling. Desktop 1440px and mobile 375px are verified separately.

Primary touch targets are at least 48px. Body/controls use 18–20px; metadata 14–16px. Numeric editing has an on-screen keypad; enum/area/boolean choices use buttons. Read results use labeled values rather than raw JSON. Technical identifiers remain internal. Standard touch keyboard remains available for user-authored names and speech text.

Start/state selection revision: replace native selects for start method, watched signal and expression kind with icon cards. Start cards include an icon, a short title, a one-line explanation and an explicit selection check. Watched signals use a compact icon grid. The less common value kinds expand from a named icon card, keeping nested conditions readable. Use radio-group semantics and arrow-key navigation as well as touch. Changing the start type within a draft preserves that type's previous settings and the downstream flow. Monitoring in test settings is presented as a selectable status card.
