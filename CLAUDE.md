# FootageOrganizer — Claude Context

## Development workflow
- **Always use TDD for new features.** Write and execute a failing test first, then write the implementation, and verify the test passes before marking the feature as complete.

## What this project is
An Electron desktop app for organizing and AI-tagging video footage libraries. Users point it at a directory, it scans all video files with ffprobe, generates thumbnails via ffmpeg, and uses an AI provider (Gemini or Ollama) to generate scene descriptions and keywords. All metadata is stored in per-project JSON files outside the footage directory.

## Tech stack
- **Electron** with `electron-vite` (v5) — three separate build targets: main, preload, renderer
- **React 19** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin — no `tailwind.config.js`, configured inline)
- **Zustand v5** — state management (two stores)
- **TanStack Table v8** + **TanStack Virtual v3** — virtualized clip table
- **@google/genai** — Gemini API client
- **ollama** npm package — Ollama client
- **ffmpeg / ffprobe** — must be installed on the host system (called via `execFile`)
- **uuid** — IDs for clips
- Build: `npm run dev` (dev), `npm run build` (prod)

## Project structure
```
src/
  main/                        # Electron main process
    index.ts                   # App bootstrap, BrowserWindow creation
    ipc/
      handlers.ts              # Registers all ipcMain.handle() calls
      scan.ts                  # Directory walk + ffprobe + content hash
      ai.ts                    # Single/batch AI description generation
      ffmpeg.ts                # Thumbnail IPC handler, tracks rootDir
      persistence.ts           # Project/settings JSON read-write, relink logic
    services/
      ffmpeg-wrapper.ts        # probeFile(), extractThumbnail(), extractFrames()
      thumbnail-cache.ts       # LRU in-memory + disk cache for thumbnails
      ai/
        provider.ts            # AIProvider interface + SCENE_PROMPT + KEYWORDS_PROMPT
        index.ts               # getProvider() factory (singleton by config)
        gemini-provider.ts     # Google Gemini implementation
        ollama-provider.ts     # Ollama implementation
    utils/
      file-filters.ts          # isVideoFile() — extension whitelist

  preload/
    index.ts                   # contextBridge — exposes window.api to renderer
    types.ts                   # Type stubs for window.api

  renderer/src/
    App.tsx                    # Root component: header, search, progress, ClipTable
    main.tsx                   # React root mount
    index.css                  # Global styles (Tailwind imports)
    stores/
      useClipStore.ts          # Core store: clips, scan, AI generation, merge logic
      useSettingsStore.ts      # AI provider config, lastOpenedDirectory
    types/
      clip.ts                  # ClipData, FootageProject interfaces
      ipc.ts                   # ScanProgress, AIProgress interfaces
      settings.ts              # AppSettings, defaultSettings
    constants/
      preset-tags.ts           # TAG_CATEGORIES with presets for each tag category
    components/
      DirectoryPicker.tsx      # "Open Directory" button
      SettingsDialog.tsx       # AI provider/key settings UI
      ProgressBar.tsx          # Scan + AI progress display
      RelinkDialog.tsx         # Handles moved/missing directories
      TagChip.tsx              # Single tag pill component
      TagEditor.tsx            # Tag add/remove popover
      ClipTable/
        ClipTable.tsx          # Virtualized table (TanStack Table + Virtual)
        columns.tsx            # Column definitions for all 14 columns
        ThumbnailCell.tsx      # Loads thumbnail via window.api.getThumbnail
        DateCell.tsx           # Formats dateShot
        SceneDescriptionCell.tsx  # Editable description + generate button
        SceneKeywordsCell.tsx  # Displays/edits scene keywords
        TagChipsCell.tsx       # Tag chips + editor for the 5 tag categories
```

## Data model

### ClipData (src/renderer/src/types/clip.ts)
```typescript
{
  id: string             // uuid v4, generated fresh on each scan
  fileName: string
  filePath: string       // absolute path (empty string if missing)
  relativePath: string   // relative to project directory
  folder: string         // subfolder within project dir ('' = root)
  dateShot: string | null  // ISO string from ffprobe creation_time
  duration: number       // seconds
  resolution: string     // e.g. "1920x1080"
  codec: string
  fileSize: number       // bytes
  contentHash: string | null  // SHA-256 of first 64KB of file
  thumbnailPath: string | null
  sceneDescription: string | null
  sceneKeywords: string[]
  visualTexture: string[]
  energy: string[]
  mood: string[]
  lightQuality: string[]
  location: string[]
  missing?: boolean      // true if file no longer found on disk
}
```

### FootageProject (persisted JSON)
```typescript
{
  version: 1
  directory: string      // absolute path to footage folder
  clips: ClipData[]
  customTags: { visualTexture, energy, mood, lightQuality }  // user-added tags
  lastUpdated: string    // ISO timestamp
}
```

## Persistence & file locations
- **Projects**: `app.getPath('userData')/projects/<sha256(dirPath)[0:12]>.json`
- **Thumbnails**: `app.getPath('userData')/thumbnails/<sha256(rootDir)[0:12]>/<relativePath>.jpg`
- **Settings**: `app.getPath('userData')/settings.json`
- All writes use atomic `.tmp` + rename pattern
- On macOS `userData` = `~/Library/Application Support/footage-organizer`

## IPC channel reference
All channels use `ipcMain.handle` / `ipcRenderer.invoke` (request-response):
| Channel | Args | Returns |
|---------|------|---------|
| `select-directory` | — | `string \| null` |
| `scan-directory` | `dirPath` | `ClipData[]` |
| `get-thumbnail` | `clipId, filePath, relativePath, duration` | `string \| null` (base64) |
| `save-project` | `dirPath, project` | void |
| `load-project` | `dirPath` | `FootageProject \| null` |
| `load-all-projects` | — | `FootageProject[]` |
| `load-settings` | — | `Record<string,unknown> \| null` |
| `save-settings` | `settings` | void |
| `generate-description` | `filePath, duration` | `{description, keywords}` |
| `generate-descriptions-batch` | `clips[]` | void (streams events) |
| `extract-keywords` | `description` | `string[]` |
| `test-ai-connection` | — | `{success, message}` |
| `check-directory-exists` | `dirPath` | `boolean` |
| `relink-project` | `oldDirPath, newDirPath` | `{matchCount, totalOldClips, totalNewFiles}` |
| `commit-relink` | — | `FootageProject` |

Push events (main → renderer via `webContents.send`):
| Event | Payload |
|-------|---------|
| `scan-progress` | `{phase, current, total, fileName?}` |
| `ai-progress` | `{current, total, fileName}` |
| `ai-result` | `{id, description, keywords}` |
| `ai-error` | `{id, error}` |

## AI pipeline
1. `extractFrames()` — pulls 3 frames at 10%, 30%, 50% of duration via ffmpeg → `Buffer[]` (512px wide JPEG, piped to stdout)
2. Provider `describeScene(frames)` — sends frames + `SCENE_PROMPT` to AI, returns 1-2 sentence description
3. Provider `extractKeywords(description)` — sends description + `KEYWORDS_PROMPT`, returns 3-5 comma-separated keywords
- Default provider: Ollama (`gemma3` at `http://127.0.0.1:11434`)
- Gemini default model: `gemini-2.5-flash`
- Provider is a singleton cached by config JSON string in `src/main/services/ai/index.ts`

## Smart metadata merging (on every scan)
When a directory is rescanned, existing clip metadata is preserved via a 3-pass merge in `useClipStore.scanDirectory()`:
1. **Pass 1**: match new clip → old clip by `relativePath`
2. **Pass 2**: match by `contentHash` (handles renames/moves within same dir)
3. **Pass 3**: cross-project hash recovery — checks all other saved projects for matching hashes (handles footage copied to a new folder)
- Unmatched old clips with any metadata become `missing: true` ghost rows

The same 2-pass merge logic lives in `persistence.ts:computeRelinkPreview()` for the relink flow.

`PRESERVED_FIELDS` (the metadata fields copied across): `sceneDescription`, `sceneKeywords`, `visualTexture`, `energy`, `mood`, `lightQuality`, `location`

## Tag categories
Five editable tag categories, each with preset values and a distinct color scheme:
- `visualTexture` (blue)
- `energy` (orange)
- `mood` (purple)
- `lightQuality` (amber)
- `location` (teal) — user-specific presets (London, Sydney, Montreal, Copenhagen)

Custom tags per category are stored in `FootageProject.customTags`.

## Key conventions
- **Electron-vite**: `@google/genai` and `ollama` are excluded from `externalizeDepsPlugin` so they bundle into the main process; `bufferutil` and `utf-8-validate` are externalized from rollup
- **No path aliases in renderer** except `@renderer` → `src/renderer/src`
- **Content hash**: SHA-256 of first 64KB of file (fast, not full-file)
- **Thumbnail cache**: in-memory LRU (max 50) + disk; keyed by `relativePath`
- **Debounced save**: tag/clip edits debounce project saves by 500ms
- **Tailwind v4**: no config file — use standard utility classes; dark theme hardcoded (`bg-[#0f0f0f]`, `bg-[#1a1a1a]`, `border-[#333]`, etc.)
- **Missing clips**: rendered at 50% opacity with strikethrough filename and red "Missing" badge

## Running the app
```bash
npm run dev      # start in dev mode
npm run build    # production build
```
ffmpeg/ffprobe are bundled (`ffmpeg-static`, `@ffprobe-installer/ffprobe`); a `$PATH` install is no longer required.

## Testing
Two layers — pick the right one for what you're verifying:
```bash
npm test             # Vitest unit tests (jsdom). Fast. Component/store/util logic.
npm run test:e2e     # builds, then Playwright drives a REAL Electron process.
npm run test:e2e:nobuild  # skip the build (when out/ is already current)
npm run test:all     # unit + build + e2e
```
- **Unit tests** (`src/**/*.test.{ts,tsx}`): jsdom. Cannot test Electron main-process behaviour (custom protocols, IPC handlers, native menus, video decoding) — jsdom has no network stack, file system bridge, or decoder.
- **E2E tests** (`e2e/*.test.ts`): launch the built app via Playwright's `_electron`. This is the ONLY layer that catches protocol-handler, IPC, and real-rendering bugs. The fixture (`e2e/fixtures/electron-app.ts`) launches with an isolated `--user-data-dir` in tmp.
- Native menu accelerators (Cmd+O etc.) are NOT triggered by Playwright keyboard input — invoke the menu item's `click()` through the main-process `Menu` API instead.
- **TDD note**: when a feature touches main-process/Electron behaviour, write the E2E test first — that's the loop that catches what unit tests structurally cannot.
