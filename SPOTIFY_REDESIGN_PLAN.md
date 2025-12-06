## Dr. Joe Media – Spotify-Style Redesign

### 1. Vision & Principles
- **Brand tone:** Keep Dr. Joe’s calming gradients (deep indigo → teal) with copper accents, but apply Spotify’s spacing, typography scale, and motion model.
- **Interaction model:** Mobile-first single page with stacked screens, no popups or modals. All transitions use slide/expand patterns like Spotify iOS.
- **Player behavior:** Mini-player docked above bottom nav; tap expands to full-screen player with hero art, metadata grid, loop/queue controls.

### 2. Information Architecture
| Layer | Description |
| --- | --- |
| **Root** | Single-page shell with header slot (for dynamic sections) and bottom navigation. |
| **Tabs** | `Home`, `Playlists`, `Favorites`, `Shared`, `Search`. Each tab scrolls vertically, uses large cards + horizontal carousels like Spotify. |
| **Detail** | Item details push on top (slide up) with metadata grid + actions; no separate dialog. |
| **Editor** | Playlist editor becomes a full-screen flow with sticky headers + segmented steps (Overview, Items, Share). |

### 3. Component Blueprint
1. **Top hero carousel** – gradient tiles featuring featured playlists, smaller CTAs.
2. **List rows** – adopt Spotify “list cell” pattern with thumbnail, title, meta row, and trailing icon cluster.
3. **Tree browser** – Recast as collapsible sections with inline search + filter chips under section headers.
4. **Player controls** – mimic Spotify: progress scrubber above controls, play/pause/skip row, loop/shuffle icons, queue button; include Dr. Joe iconography for durations.

### 4. Visual System
| Token | Value |
| --- | --- |
| Primary | `#1d1f3b` |
| Accent | `#5dd8c5` |
| Glow | `#f7b267` |
| Text primary | `#f4f6ff` |
| Text secondary | `#a9b1d9` |
| Corner radius | 16px containers, 48px buttons |
| Elevation | Soft drop-shadows, blurred backgrounds (backdrop-filter) |

Typography: Inter (or system San Francisco) with weights 400/500/700, 13/15/28px sizes per Spotify mobile.

### 5. Migration Tasks & Status
| ID | Task | Description | Status | Owner |
| --- | --- | --- | --- | --- |
| D1 | Design Audit | Map every existing screen/component to Spotify-equivalent pattern. | ✅ | GPT-5.1 Codex |
| D2 | Wireframe IA | Produce low-fi wireframes for tabs, detail, player, editor. | ✅ | GPT-5.1 Codex |
| D3 | Visual Spec | Finalize color/typography/component tokens. | ✅ | GPT-5.1 Codex |
| D4 | Layout Shell | Build new shell (bottom nav + stacked screens). | ✅ | GPT-5.1 Codex |
| D5 | Player Revamp | Implement mini/full player flows. | ✅ | GPT-5.1 Codex |
| D6 | List/Detail Refactor | Convert catalog views to Spotify-style cards. | ✅ | GPT-5.1 Codex |
| D7 | Playlist Editor Flow | Replace dialog with full-screen stepped editor. | ✅ | GPT-5.1 Codex |
| D8 | Shared Playlists | Integrate into new IA, ensure Supabase UI matches style. | ✅ | GPT-5.1 Codex |
| D9 | QA + Polish | Device testing, motion tuning, accessibility, CSS polish. | ✅ | GPT-5.1 Codex |

✅ = complete, ⏳ = pending/in progress.

### 6. Next Steps
1. Produce clickable wireframes (Figma or figjam spec) – deliverable for review.
2. Review/approve design doc & wireframes with stakeholder.
3. Implement layout shell + player in a feature branch.
4. Migrate remaining screens component by component.

Document will track progress; update the task table as milestones complete.

### 7. Wireframe Snapshots (Textual)
**Home Tab**
```
[Top Hero Carousel — swipeable gradient cards]
[Recently Played — horizontal pills]
[Morning Practices — vertical list of media cells]
[Collections — collapsible sections]
```

**Playlists Tab**
```
[Pinned Playlist Banner]
[My Playlists — list cells with badge chips]
[Shared Playlists — segmented control My | Shared]
[CTA row: + New Playlist, Import, Share]
```

**Favorites Tab**
```
[Search + Filter chips (Genre, Year)]
[Favorite items list — same cell as Home but with star indicator]
```

**Shared Tab**
```
[Status banner (online/offline)]
[Shared list grouped by owner]
[“Add to Library” and “Remove” swipe actions]
```

**Search Tab**
```
[Sticky search bar]
[Genre chips slider]
[Results grouped by Collection -> Items]
```

**Detail Sheet**
```
[Cover art + gradient backdrop]
[Title + metadata grid (artist, album, year, genre)]
[Action row: Play, Add to Playlist, Favorite, Share]
[Changelog/Notes accordion]
```

**Player (Mini)**
```
[Track thumbnail][Title + subtitle][Play/Pause][Queue]
```

**Player (Full)**
```
[Hero art gradient filling top 60%]
[Waveform/progress scrubber]
[Primary controls row (shuffle, back, play/pause, forward, loop)]
[Secondary row (like, playlist, share, queue)]
[Upcoming queue preview]
```

**Playlist Editor Flow**
```
[Step 1 Header] Name + cover selection + visibility toggle
[Step 2] Items with tree view + inline search
[Step 3] Share settings + Supabase sync state
[Sticky footer buttons aligned like Spotify (Left: Cancel, Right: Save)]
```

### 8. Visual Specification Details
- **Spacing Scale:** 4px increments (4, 8, 12, 16, 24, 32). Sections separated by 24px, inner padding 16px.
- **Typography Scale:** 
  - Title XL 28/32 bold
  - Title L 22/26 semibold
  - Body 16/22 regular
  - Meta 13/18 medium uppercase
- **Iconography:** Mix of SF Symbols style (thin line) and custom glyphs for Dr. Joe brand; unify sizes to 20px.
- **Motion:** 250ms ease-out for pushes, 350ms spring for player expand, 150ms fade for chip toggles.
- **Elevation:** Use blurred translucent panels (background: rgba(11, 15, 35, 0.75) + backdrop-filter: blur(20px)) for cards/player.

### 9. Implementation Strategy (Draft)
| Phase | Scope | Key Tasks | Dependencies |
| --- | --- | --- | --- |
| P1 – Shell & Theme | Build Spotify-style shell, nav, global styles. | Create layout scaffold, bottom nav, mini-player placeholder, move app state to new shell provider. | Approved visual spec. |
| P2 – Player Experience | Implement mini/full player, controls, metadata surfaces. | Refactor audio/video hooks, add queue management UI, integrate loop toggle per design. | P1 shell complete. |
| P3 – Content Surfaces | Rebuild Home/Playlists/Favorites/Shared/Search tabs using new components. | Create reusable `MediaCell`, hero carousel, horizontal rails; migrate existing data flows. | P1 + player APIs. |
| P4 – Playlist Editor & Sharing | Replace dialog with stepped flow, integrate Supabase states. | Build stepper, item selector tree, share controls with toast feedback. | P3 list components. |
| P5 – Polish & QA | Motion tuning, accessibility, responsive adjustments, catalog duration checks. | Device testing, bug fixes, final asset pass. | All prior phases. |

Tracking: as each phase completes, update D4–D9 statuses correspondingly.

