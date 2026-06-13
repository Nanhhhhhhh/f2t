# RECORDING-GUIDE.md — F2T Thesis Demo Video

> **Cross-references:**
> - Script with timestamps and Vietnamese voiceover: [`docs/demo/VIDEO-SCRIPT.md`](VIDEO-SCRIPT.md)
> - Service startup and health gates: [`docs/demo/DEMO-READY-CHECKLIST.md`](DEMO-READY-CHECKLIST.md)

---

## 0. Pre-flight (run before anything else)

Work through every section of `DEMO-READY-CHECKLIST.md` in order:

1. Set all required env vars (especially `UPLOAD_BASE_URL` — LAN IP, not `localhost`).
2. Start the 7 terminals in the specified sequence; wait for each `startup complete` banner.
3. Pass all 5 health gates (§2a–2e) — both dashboards must render.
4. Run the 7 smoke tests (§4a–4g) — confirm live events appear in both Observatory dashboards before you touch the camera.
5. Do a full dry run of every scene at least once with no recording active.

Keep the probe command from §4a ready to paste into a terminal during the 5:00–5:40 scene:

```bash
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"state_vectors":[{"productId":"demo1","category":"fruit","freshness":0.35,"inventory_ratio":0.9,"base_price":20000,"competitor_ref_price":19000,"demand_7d":10}]}'
```

Ví dụ (giá trị chính xác phụ thuộc action của DDQN): `"targetPrice":15000.0, "delta_pct":-25.0, "safety_clipped":true, "freshness_tag":"critical"`.

Tiêu chí PASS thực sự xem DEMO-READY-CHECKLIST.md §4 — chỉ cần freshness_tag=critical và targetPrice ≤ 15000.

---

## 1. Capture targets and device strategy

### CRITICAL: freshness scan needs a real camera

> The freshness scan feature (scene 2:00–2:30) uses two CoreML binary classifiers running **on-device**. iOS Simulator and Android Emulator have **no camera hardware** — the freshness scan cannot be captured live on a simulator. Choose one of the three options below before you start recording.

| Option | Effort | Quality |
|---|---|---|
| **(A) Real iPhone or Android** | Medium — requires USB cable, trust dialog, extra setup | Best: live camera + real CoreML output |
| **(B) Pre-saved photo via sidecar API** | Low — just a curl command | Good: shows real model output; no camera animation |
| **(C) Pre-recorded clip** | Lowest | Acceptable: not live, but avoids camera entirely |

**Option A details** — see §2c below (QuickTime + USB or iPhone Mirroring).

**Option B details** — call the freshness endpoint with a base64-encoded image of a fruit or root vegetable. This proves the classifier works without needing a live camera in the recording:

```bash
# encode a local image and post it to the pricing sidecar
IMG_B64=$(base64 -i /path/to/fruit.jpg | tr -d '\n')
curl -s -X POST http://localhost:8000/freshness/classify \
  -H "Content-Type: application/json" \
  -d "{\"image_b64\":\"$IMG_B64\",\"category\":\"fruit\"}"
```

Use a `fruit` or `root` image — CoreML models are only trained for those two categories. Do not use `leafy` or `herbs` (no model available).

**Option C details** — record the freshness scene on a real device in a separate session beforehand; import that clip into the timeline in the editing step.

### Recommended split

| Scene range | Capture method |
|---|---|
| 0:00–1:50 (consumer flow) | iOS Simulator or Android Emulator — screen recording |
| 2:00–2:30 (freshness scan) | One of Options A / B / C above |
| 2:30–2:40 (admin) | Simulator screen recording |
| 2:40–6:00 (Part 2 — split-screen) | Simulator + dashboard side-by-side, region capture |

---

## 2. macOS screen recording tools

### 2a. Built-in screenshot toolbar (recommended for most scenes)

Press **Shift-Cmd-5** (`⇧⌘5`) to open the screenshot and screen recording toolbar. Options:

- **Record Entire Screen** — captures everything.
- **Record Selected Portion** — drag to draw a rectangle; only that region is captured. Use this to frame the phone + dashboard together for Part 2.

Click **Record** (or **Options** first to choose microphone). Click the stop button in the menu bar when done. Output goes to `~/Desktop` by default as `.mov`.

### 2b. QuickTime Player — screen recording

1. Open QuickTime Player.
2. **File ▸ New Screen Recording**.
3. Click the dropdown arrow next to the record button to choose audio source.
4. Click in a window to record that window only, or drag a region, or click anywhere to record the full screen.

QuickTime saves as `.mov`. Works identically to `⇧⌘5` but provides a menu-driven flow.

### 2c. iOS Simulator — built-in recording

The iOS Simulator has its own screen recorder that avoids capturing the macOS chrome around it.

**Via menu:** In Simulator, choose **File ▸ Record Screen** (`Ctrl-Cmd-R` to start/stop).

**Via command line** (records while a script or session runs):

```bash
xcrun simctl io booted recordVideo ~/Desktop/sim-recording.mp4
# press Ctrl-C in the terminal to stop
```

Output is a clean `.mp4` at the Simulator's logical resolution. Prefer this for Part 1 scenes.

### 2d. Real iPhone — QuickTime or iPhone Mirroring

**QuickTime over USB (macOS 13+):**

1. Connect iPhone via USB; trust the computer if prompted.
2. Open QuickTime Player.
3. **File ▸ New Movie Recording**.
4. Click the dropdown arrow next to the record button → select the iPhone as the camera source.
5. The iPhone's screen appears in the QuickTime window; click Record. Audio from the iPhone microphone is also captured (mute it in editing).

**iPhone Mirroring (macOS 15 Sequoia and later):**

1. Open the iPhone Mirroring app (comes with macOS 15).
2. The iPhone screen streams live to a macOS window.
3. Use `⇧⌘5` to record a region covering that window (or the full screen).

Either approach gives a clean recording without a physical camera pointing at the phone.

### 2e. Android Emulator — built-in screen record

In the Android Emulator, click the **three-dot menu ▸ Screen Record**. Output is `.webm` or `.mp4` depending on the API level.

**Real Android via adb:**

```bash
adb shell screenrecord /sdcard/demo.mp4
# press Ctrl-C to stop, then pull the file:
adb pull /sdcard/demo.mp4 ~/Desktop/demo.mp4
```

**Real Android via scrcpy** (open source, mirrors and records simultaneously):

```bash
scrcpy --record ~/Desktop/demo.mp4
```

---

## 3. Part 2 side-by-side layout (2:40–6:00)

The script calls for a split-screen showing the app on the left and the Vite ML Observatory (`http://localhost:5173`) on the right.

### Recommended approach — single region capture

1. Open the iOS Simulator window (or iPhone Mirroring window).
2. Open a browser window with `http://localhost:5173`.
3. Arrange the two windows side by side so they do not overlap.
4. Press `⇧⌘5`, choose **Record Selected Portion**, drag a rectangle that covers both windows exactly.
5. Start recording. Both windows are captured in a single video file with the correct layout.

Resize the Simulator to a smaller size if needed — the dashboard needs to show the obs vector (12 fields) and rule scores clearly. Aim for at least 50% of the frame width for the dashboard.

### Alternative — picture-in-picture composite in the editor

If the two windows cannot be arranged side by side cleanly:

1. Record the Simulator separately (§2c).
2. Record the dashboard browser separately (`⇧⌘5` on just the browser window).
3. In DaVinci Resolve or iMovie: put the dashboard recording on the primary track; put the Simulator recording as an overlay (picture-in-picture) in the lower-left or lower-right corner.

The single-region approach is simpler and avoids sync issues between two separate recordings.

### Dashboard to use for Part 2

Use the **Vite dashboard** at `http://localhost:5173` (directory: `ml-observatory/`) as the primary visual — it shows the real-time event log with all fields visible in a table format. The **Streamlit dashboard** at `http://localhost:8501` is also running; you can briefly switch to it if you want to show a chart view, but keep the Vite dashboard as the anchor.

> **Lưu ý:** Streamlit cần click 'Refresh feed' (hoặc tương tác widget) để hiện event mới — nó KHÔNG tự cập nhật như dashboard web (SSE). Khuyến nghị dùng dashboard web cho cảnh live.

---

## 4. Voiceover

### Recording tools

- **QuickTime Player → File ▸ New Audio Recording** — simplest on macOS; saves `.m4a`.
- **Voice Memos** (macOS app) — works well, saves to iCloud automatically.
- **GarageBand** (free on macOS) — better noise reduction and level control if background noise is an issue.
- **TTS fallback** — if a human narrator is not available, any TTS service (Zalo TTS, Google Cloud TTS with a Vietnamese voice) can generate the audio from the script text.

### Recommended approach

Record **per scene** rather than one continuous take. Each timestamp block in `VIDEO-SCRIPT.md` is a natural break point. Label files by timestamp: `vo-000-015.m4a`, `vo-015-035.m4a`, etc.

Benefits: you can re-record a single scene if a take is poor, and syncing in the editor is simpler (each clip goes to the corresponding timestamp on the timeline).

### Practicalities

- Close all notification apps (Slack, Mail) before recording to avoid sound interruptions.
- Use a quiet room; macOS fans can be audible on internal microphone recordings — an external USB or headset microphone reduces this.
- Record a 2-second silence at the start and end of each clip for editing headroom.
- Listen back to the playback immediately after each scene and re-record if there is clipping or obvious background noise.

---

## 5. Editing

### Recommended free tools

| Tool | Platform | Notes |
|---|---|---|
| **iMovie** | macOS (free, pre-installed) | Easiest; limited but sufficient for this video |
| **DaVinci Resolve** (free tier) | macOS | Professional features; handles multi-track audio and picture-in-picture well |
| **CapCut** (desktop) | macOS | Simple timeline; good for quick caption overlays |

### Editing steps

1. **Import all clips** into a new project. Arrange them on the timeline in the timestamp order from `VIDEO-SCRIPT.md`.

2. **Mute the original audio** track on every video clip. The original audio is either system sound (useless) or ambient noise from a physical phone recording.

3. **Add the voiceover track.** Drop each per-scene `.m4a` file onto an audio track aligned to the matching timestamp. Use the timestamp column of `VIDEO-SCRIPT.md` to place each clip. Trim or extend the video clip length to match the voiceover if needed — the script timestamps are targets, not hard constraints.

4. **Add caption overlays.** The **Caption** column in `VIDEO-SCRIPT.md` gives the text for each scene. Add each as a title or lower-third text overlay using the editor's built-in text tool. Use a legible sans-serif font at 24–30pt, white text with a dark shadow or semi-transparent background so it is readable over both light and dark video content.

5. **Add the title card** at 0:00–0:15: logo, project title, student name/ID, university, year.

6. **Add an end card** at 5:40–6:00: summarize the 4 AI functions and limitations as bullet points (matching the voiceover text in the script).

7. **Color/brightness check.** Make sure the dashboard text (obs vector values, rule scores) is legible in the exported video. If the Simulator or browser window looks dim, apply a brightness/contrast adjustment on that clip.

8. **Export settings:**
   - Resolution: **1920×1080** (1080p)
   - Format: **H.264 MP4** (`.mp4`)
   - Target duration: **~6 minutes**
   - Frame rate: 30 fps
   - Audio: AAC 128 kbps or higher

   In DaVinci Resolve: Deliver page → Master → MP4, H.264, 1080p 30fps.
   In iMovie: File ▸ Share ▸ File → Resolution 1080p, Quality High.

---

## 6. Common pitfalls

**Simulator has no camera.**
The freshness scan scene (2:00–2:30) requires the device camera + CoreML. Plan for one of the three options in §1 above before recording day — do not discover this on the day.

**Use the LAN IP, not `localhost`, for `UPLOAD_BASE_URL`.**
If a real device is used for any scene, images uploaded from the backend will fail to load unless `UPLOAD_BASE_URL` is set to `http://192.168.x.x:3000` (the dev machine's LAN IP). Set this in `f2t-backend/.env.development` before starting the backend.

**Sidecar URLs on different hosts.**
If the sidecars (`localhost:8000`, `localhost:8001`) are on a different machine from the device running the app, set `PRICING_SIDECAR_URL` and `RECOMMENDER_SIDECAR_URL` in the backend env to the appropriate LAN IPs. CORS must also be enabled on both sidecars for the browser dashboard to receive SSE events.

**SSE / live events not appearing in the Vite dashboard.**
The ML Observatory uses Server-Sent Events (SSE). If you are behind a reverse proxy or the browser blocks mixed content (HTTP vs HTTPS), SSE connections may drop silently. For the demo, serve everything over plain HTTP on the LAN and keep browser security exceptions minimal.

**Dashboard text not legible in the exported video.**
Record at 1920×1080 or higher. The obs vector has 12 fields and the rule table has 3 columns — if the dashboard window is too small, these will be unreadable after export. Make the browser window at least 900px wide, zoom the browser to 110–125% if needed, and verify legibility on a full-resolution preview before doing the final export.

**Freshness scene: use only `fruit` or `root`.**
CoreML models exist only for these two categories. Do not demo freshness scan on `leafy` or `herbs` — the classifier will return an error or fallback that contradicts the script. Pick a product from `fruit` or `root` as stated in `VIDEO-SCRIPT.md §Sản phẩm demo được khuyến nghị`.

**Both dashboards must show live events before recording Part 2.**
Run the smoke test in `DEMO-READY-CHECKLIST.md §4f` — trigger a `/predict` call and confirm the event appears in the Vite dashboard within ~2 seconds. If it does not appear, check the SSE connection (browser dev tools → Network → EventStream) before rolling the camera.

**Re-seed the database if accounts were modified.**
If a previous session changed order state or account data, re-run `npm run seed` from `f2t-backend/` to reset to a clean state. The seed script clears existing demo documents before re-inserting.
