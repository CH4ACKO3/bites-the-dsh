import type { LocaleDictOf } from '@deepseek-ai/dsh-client-ui-slots'
import type { PlaybackLocaleKey } from './contract.js'

export const PLAYBACK_LOCALE_NAMESPACE = 'bites-the-dsh' as const

const en: Record<PlaybackLocaleKey, string> = {
  enter: 'Replay session',
  historical: 'Historical',
  stepBack: 'Previous event',
  reverse: 'Play backward',
  pause: 'Pause',
  forward: 'Play forward',
  stepForward: 'Next event',
  rate: 'Playback speed',
  skipIdle: 'Skip idle',
  idleLimit: 'Maximum retained idle time',
  idleSeconds: '{seconds} sec',
  positionMode: 'Position unit',
  events: 'Events',
  turns: 'Turns',
  time: 'Time',
  jumpToEvent: 'Jump to event',
  jumpToTurn: 'Jump to turn',
  jumpToTime: 'Jump to time',
  exitReplay: 'Exit replay',
  readonly: 'Historical replay is read-only',
}

const zh: Record<PlaybackLocaleKey, string> = {
  enter: '回放会话',
  historical: '历史回放',
  stepBack: '上一个事件',
  reverse: '倒放',
  pause: '暂停',
  forward: '正放',
  stepForward: '下一个事件',
  rate: '播放速度',
  skipIdle: '跳过空闲',
  idleLimit: '最多保留的空闲时长',
  idleSeconds: '{seconds} 秒',
  positionMode: '位置单位',
  events: '事件',
  turns: '轮次',
  time: '时间',
  jumpToEvent: '跳转到事件',
  jumpToTurn: '跳转到轮次',
  jumpToTime: '跳转到时间',
  exitReplay: '退出回放',
  readonly: '历史回放为只读模式',
}

export const playbackDictionaries: Record<'en' | 'zh', LocaleDictOf<typeof PLAYBACK_LOCALE_NAMESPACE>> = {
  en,
  zh,
}
