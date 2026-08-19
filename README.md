# dsh-bites-the-dust

Read-only, scriptable session playback for the DeepSeek Harness WebUI.

The plugin will turn the native conversation into a replay view without opening a separate panel. A single native control enters or exits playback. While playback is active, the conversation is fully read-only: UI and scripts may move time, but may not mutate the source session.

## Product contract

- The append-only session event log remains the source of truth.
- Playback projects the native conversation at `cursorSeq` without changing the source session.
- Live events may advance `liveHeadSeq` while a historical cursor remains fixed.
- The browser API controls only playback time: enter, exit, play, pause, seek, step, rate, and idle skipping.
- Returning to Live sets `cursorSeq === liveHeadSeq` and restores native interaction.
- UI integration will use exact, version-pinned Harmony source patches after inspecting the installed DSH bundle.

The first workspace layer provides the DSH browser plugin entry and the tested per-session playback controller. Native conversation projection and controls are the next layer.

## Development

Requires Node.js `^22.22.3 || >=24.11.1` and pnpm 11.

```sh
pnpm install
pnpm check
```

The current DSH compatibility target is `0.1.0-rc.8`.

## License

MIT
