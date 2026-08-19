# dsh-bites-the-dust

Read-only, scriptable session playback for the DeepSeek Harness WebUI.

The plugin turns the native conversation into a replay view without opening a separate panel. A single native session-header control enters replay. While replay is active, the conversation is fully read-only: the native composer and session-changing interactions are blocked, while UI and scripts may move time without mutating the source session.

## Product contract

- The append-only session event log remains the source of truth.
- Playback projects the native conversation at `cursorSeq` without changing the source session.
- Live events may advance `liveHeadSeq` while a historical cursor remains fixed.
- The browser API controls only playback time: enter, exit, play, pause, seek by sequence/event/turn/time, step, rate, and idle skipping.
- Exiting replay sets `cursorSeq === liveHeadSeq` and restores native interaction.
- Playback automatically extends the loaded history window when the cursor reaches its oldest event.
- UI integration uses exact, version-pinned Harmony source patches against the inspected DSH bundle.

## Current implementation

- Native session-header entry and compact playback controls.
- Pause, forward play, reverse play, event stepping, speed selection, adjustable idle-gap compression, and direct event/turn/time seeking.
- A per-session observable controller exposed as `ctx.sessionPlayback` for time-only scripting.
- Historical projection through DSH's native `ChatView`; the source session and live head continue independently.
- Historical timelines expose `playbackClock: { kind: 'historical', time: cursorTime }` so projection consumers never treat an open historical turn as live wall-clock work.
- Native composer, model, stop, branch, and assistant write actions are disabled during replay; viewing controls remain interactive.
- English and Chinese labels using DSH theme tokens, without a separate panel.

The current compatibility target is DSH `0.1.0-rc.8`. Harmony selector drift fails the automated test instead of silently changing the wrong component.

## Development

Requires Node.js `^22.22.3 || >=24.11.1` and pnpm 11.

```sh
pnpm install
pnpm check
```

## License

MIT
