const STYLE_ID = '@ch4acko3/dsh-bites-the-dust/client'

const styles = `
.dsh-btd-enter,
.dsh-btd-iconButton,
.dsh-btd-live,
.dsh-btd-idle {
  border: 0;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  cursor: pointer;
  font: var(--dsw-font-xs-13);
}

.dsh-btd-enter {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.dsh-btd-enter:hover,
.dsh-btd-iconButton:hover:not(:disabled),
.dsh-btd-idle:hover,
.dsh-btd-live:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-btd-enter:focus-visible,
.dsh-btd-iconButton:focus-visible,
.dsh-btd-idle:focus-visible,
.dsh-btd-live:focus-visible,
.dsh-btd-rate:focus-visible,
.dsh-btd-positionMode:focus-visible,
.dsh-btd-positionRange:focus-visible,
.dsh-btd-idleDuration:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

.dsh-btd-controls {
  height: 28px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 0 3px 0 8px;
  box-sizing: border-box;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xs-13);
  font-variant-numeric: tabular-nums;
}

.dsh-btd-toolbarGroup {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dsh-btd-toolbarSeparator {
  width: 1px;
  height: 16px;
  flex: none;
  background: var(--dsw-alias-border-l2);
}

.dsh-btd-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 3px;
  white-space: nowrap;
}

.dsh-btd-statusDot,
.dsh-btd-liveDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.dsh-btd-statusDot {
  background: var(--dsw-alias-state-warn-primary);
}

.dsh-btd-liveDot {
  background: var(--dsw-alias-state-success-primary);
}

.dsh-btd-position {
  max-width: 154px;
  color: var(--dsw-alias-label-caption);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-btd-positionControl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.dsh-btd-positionMode,
.dsh-btd-idleDuration {
  height: 24px;
  padding: 0 15px 0 6px;
  border: 0;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background-color: transparent;
  cursor: pointer;
  font: var(--dsw-font-xs-13);
}

.dsh-btd-positionMode {
  min-width: 54px;
}

.dsh-btd-positionRange {
  width: 72px;
  height: 18px;
  margin: 0;
  padding: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.dsh-btd-positionRange::-webkit-slider-runnable-track {
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-border-l1);
}

.dsh-btd-positionRange::-webkit-slider-thumb {
  width: 10px;
  height: 10px;
  margin-top: -4px;
  border: 0;
  border-radius: 50%;
  appearance: none;
  background: var(--dsw-alias-state-business-primary);
}

.dsh-btd-positionRange::-moz-range-track {
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-border-l1);
}

.dsh-btd-positionRange::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: 0;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary);
}

.dsh-btd-positionRange:disabled,
.dsh-btd-idleDuration:disabled {
  cursor: default;
  opacity: .4;
}

.dsh-btd-divider {
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: var(--dsw-alias-border-l2);
}

.dsh-btd-iconButton {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
}

.dsh-btd-iconButton[data-active='true'] {
  color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-btd-iconButton:disabled {
  cursor: default;
  opacity: .35;
}

.dsh-btd-rate {
  height: 24px;
  min-width: 44px;
  padding: 0 15px 0 6px;
  border: 0;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background-color: transparent;
  cursor: pointer;
  font: var(--dsw-font-xs-13);
}

.dsh-btd-idle {
  height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.dsh-btd-idle[data-active='true'] {
  color: var(--dsw-alias-state-business-primary);
}

.dsh-btd-idleDuration {
  min-width: 58px;
}

.dsh-btd-live {
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

[data-session-playback-readonly='true'] [data-composer-seat] {
  opacity: .62;
}

@media (max-width: 760px) {
  .dsh-btd-statusLabel {
    display: none;
  }

  .dsh-btd-controls {
    padding-left: 6px;
  }

  .dsh-btd-positionRange {
    width: 48px;
  }

  .dsh-btd-position {
    max-width: 92px;
  }
}

@media (max-width: 960px) {
  .dsh-btd-controls {
    max-width: max(230px, calc(100vw - 526px));
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }

  .dsh-btd-controls > * {
    flex: none;
  }

  .dsh-btd-controls::-webkit-scrollbar {
    display: none;
  }

  .dsh-btd-live {
    position: sticky;
    right: 0;
    background: var(--dsw-alias-bg-layer-1);
  }

  .dsh-btd-statusLabel {
    display: none;
  }
}
`

export function installPlaybackStyles(): () => void {
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = '@ch4acko3/dsh-bites-the-dust'
  tag.dataset.pluginCss = STYLE_ID
  tag.textContent = styles
  document.head.appendChild(tag)
  return () => tag.remove()
}
