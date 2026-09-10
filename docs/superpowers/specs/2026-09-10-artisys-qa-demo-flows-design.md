# ArtiSys QA Demo Flows Design

## Goal
Extend `artisys-qa` with reusable demonstration flows, distinct from test flows, so any consumer can generate polished walkthrough videos for product demos and social formats without duplicating recording logic.

## Scope
- Keep existing QA/test flows unchanged.
- Add a `demos` manifest section alongside `flows`.
- Add presets: `landscape-16x9`, `square-1x1`, `reels-9x16`.
- Allow duration target, holds/pacing, cursor visibility and demo-only metadata.
- Generate the same evidence set as QA plus `demo-summary.json`.
- Support web and Electron consumers.
- Reels output uses 1080x1920 MP4. Desktop systems are rendered into a portrait canvas without squashing the application window.
- No music, narration, captions or editorial motion in this version.

## Architecture
The core runner remains responsible for launching Chromium/Electron, telemetry, screenshots, traces and video capture. Demo behavior is layered on top through a demo resolver and preset metadata. Demo steps reuse the existing declarative step engine with an additional `holdMs` pacing field.

For Electron portrait output, the application window remains at a practical desktop viewport. Captured frames are composed into a 1080x1920 portrait canvas using ffmpeg scaling/padding, preserving aspect ratio. Web flows may use the preset viewport directly when the product is responsive.

## Manifest contract
Consumers may define:

```json
{
  "demos": {
    "quick-30s": {
      "file": "demo/quick-30s.json",
      "preset": "reels-9x16",
      "durationTargetSec": 30
    }
  }
}
```

Existing `flows` remain valid and are not reinterpreted as demos.

## Presets
- `landscape-16x9`: 1920x1080 output.
- `square-1x1`: 1080x1080 output.
- `reels-9x16`: 1080x1920 output.

Each preset declares output dimensions and a capture viewport. Electron consumers may override the capture viewport while retaining the output canvas.

## Demo flow format
A demo file has `name`, optional `title`, optional `durationTargetSec`, and `steps`. Every step supports the existing action fields plus optional `holdMs` after the action. The runner records actual elapsed duration and reports deviation from target.

## Output
A demo run writes:
- `video.mp4` for demo output;
- `screenshots/`;
- `trace.zip`;
- `telemetry.json`;
- `run-summary.json`;
- `demo-summary.json` with preset, target duration, actual duration and timing deviation.

## Consumer template
The module template will include `demo/quick-30s.json` and manifest examples for the three presets. Consumers only define product selectors/routes and demo order.

## PDV first consumer
PDV ArtiSys receives `quick-30s` and `overview-60s` demo definitions. The 30-second demo will showcase home, products, stock, checkout, cash and reports using non-destructive navigation and test data only.

## Error handling
- Unknown demo/preset fails before launching the browser.
- Invalid output dimensions fail validation.
- Missing selectors or failed steps preserve failure screenshot, trace and telemetry.
- Duration target is advisory; it is reported, not a pass/fail gate.

## Testing
Unit tests cover preset resolution, manifest validation and timing metadata. Existing module browser tests remain green. PDV consumer CI validates that demo definitions resolve and a real Electron demo capture succeeds in GitHub Actions.
