# React migration audit

Audited on 11 September 2026. Revalidated after pulling `master` at `248f7ff`. The fixes are on `fix/react-migration-parity`, with one commit per issue. Backbone removal is explicitly outside this branch's scope.

The original audit found eleven migration gaps. Those findings and the two additional mobile concerns now have fixes and Cypress regression coverage.

| Finding | Result | Commit | Cypress spec |
| --- | --- | --- | --- |
| 1. Draft text and files transferred between conversations | Drafts persist by wave ID; pending uploads finish against their originating draft | `9398563` | `react-drafts.spec.cy.js` |
| 2. Historical authors could crash React | Stable missing-user rendering and deduplicated author lookup, including nested replies | `b650856` | `react-authors.spec.cy.js` |
| 3. Mention notifications missing | Unread mention alerts with exact-message navigation; read, own and duplicate messages excluded | `01b3cf7` | `react-notifications.spec.cy.js` |
| 4. Avatar private-chat shortcut missing | Double-click reuses an existing two-person wave or creates one; self clicks do nothing | `adaeda9` | `react-private-chat.spec.cy.js` |
| 5. Participant presence and names stale | Headers and composer mention completion subscribe to live user changes | `d7918dd` | `react-presence.spec.cy.js` |
| 6. Existing media preferences ignored | Preserves per-user numeric preferences and disabled defaults; adopts old React global preferences once | `36988f2` | `react-preferences.spec.cy.js` |
| 7. Disconnection recovery could stop | Recovery remains visible during startup and after Escape/background clicks; probes with backoff; respects forced disconnects | `565e403` | `react-recovery.spec.cy.js` |
| 8. Multiple links lost previews | Stores and renders previews for all distinct eligible URLs; exclusions follow media settings | `20db924` | `react-previews.spec.cy.js` |
| 9. Archived/invalid conversation navigation had no fallback | Landing and inaccessible links select an available conversation, including archives; empty waves archive by default | `4da301b` | `react-navigation.spec.cy.js` |
| 10. Read conversations opened at the top | Initial layout scrolls to the first unread or the bottom, accounts for delayed fonts/images and preserves manual scrolling | `7ac0a73` | `react-scroll.spec.cy.js` |
| 11. Composer and participant keyboard features missing | Restores two-space unread navigation, masked-email search/display and Tab selection; translates picker strings | `d7d121e` | `react-keyboard.spec.cy.js` |
| Touch reply gesture | Double taps open replies; swipes and interactive elements are excluded | `71fb6a7` | `react-touch.spec.cy.js` |
| Mobile upload controls hidden | Attachment and send buttons remain visible on mobile; upload strings translated into Hungarian | `c2b6b00` | `react-mobile-upload.spec.cy.js` |

The new specs run the production React build against a controlled Socket.IO fixture server. This allows deterministic coverage of delayed uploads, former participants, browser notification permissions, user updates and connection failures. The existing `surf.spec.cy.js` and `upload.spec.cy.js` exercise real backend messaging, invitations, history and image uploads. The upload test now explicitly enables inline pictures to match the restored disabled default.

## Validation

- React TypeScript and production build passed.
- Backend TypeScript build passed.
- All 92 backend tests passed in six files.
- All 33 Cypress tests passed across 15 specs, including 28 new regression tests and the five existing full-stack tests.

The real backend checks use the isolated MongoDB database `surf_migration_fixes_20260911`, a temporary Redis instance on port 16379 with persistence disabled, and uploads under `/private/tmp/surf-migration-fixes-uploads`.

Production Google OAuth, native OS notification presentation and physical-device touch/keyboard behavior have not been exercised. Cypress covers notification callbacks and synthetic touch gestures at a mobile viewport. Vite still reports the pre-existing relative CSS logo URL warning.

## Separate Backbone removal work

Core authentication, conversation creation/renaming, invitations, messaging, threaded replies, history, read state, profile editing, media rendering and React image uploads remain implemented. Before removing Backbone, complete the production OAuth and supported-device checks, then:

- Simplify `code/src/routerClient.ts` to serve React, removing cookie/environment client selection and handling old switch URLs.
- Remove the Backbone install/build stage from `Dockerfile`, then verify the React-only image.
- Consolidate the two CI workflows and remove Backbone-only test configuration.
- Update `CLIENT_SWITCHING.md`, the obsolete Vue description in `MIGRATION.md`, and development documentation.
- Remove `client/`, its dependency files and obsolete ignore paths.

This branch retains both clients, their selection routes and the existing Docker/CI structure.
