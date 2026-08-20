# Bites the DSH

Read-only, scriptable session playback for the DeepSeek Harness WebUI.

https://github.com/user-attachments/assets/3c9dfdcf-a454-4750-9edf-76771ed5a9a6

The demo shows Bites the DSH together with [dsh-turn-fold](https://github.com/CH4ACKO3/dsh-turn-fold).

The plugin turns the native conversation into a replay view without opening a separate panel. A single native session-header control enters replay. While replay is active, the conversation is fully read-only: the native composer and session-changing interactions are blocked, while UI and scripts may move time without mutating the source session.

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

## CI/CD

Every push to `main` and every pull request runs `pnpm check`. Publishing a
GitHub Release whose tag matches `v<package.json version>` publishes the public
package to npm with provenance. Add an npm automation token as the repository
secret `NPM_TOKEN` before publishing the first release.

## License

MIT
