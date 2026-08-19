import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { SessionPlaybackController } from './playback-controller.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    sessionPlayback: SessionPlaybackController
  }
}

export const name = '@ch4acko3/dsh-bites-the-dust'
export const inject = [] as const

export function apply(ctx: ClientContext): void {
  ctx.provide('sessionPlayback', new SessionPlaybackController())
}

export * from './playback-controller.js'
