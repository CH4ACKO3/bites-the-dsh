# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

DeepSeek Harness `0.1.0-rc.8` browser plugin, TypeScript, React, and version-pinned dsh-harmony source patches.

## Users

DSH users reviewing an agent session who need to inspect how the conversation developed without disturbing the live session.

## Product Purpose

Turn the native DSH conversation into a read-only, scriptable session replay. Success means a user can enter replay from the existing session header, move through recorded event time, and return to Live without mutating the source session.

## Positioning

The product reprojects DSH's append-only event log inside the native conversation instead of opening a separate replay panel or pretending to restore the execution world.

## Operating Context

Replay runs in the DSH WebUI against the currently visible session. Live events may continue arriving while the historical cursor remains fixed. The native conversation, Trajectory view, and browser-side playback API share one per-session time controller.

## Capabilities and Constraints

- A single native session-header control enters and exits replay.
- Replay is fully read-only. Its script API controls time only and exposes no session mutation operations.
- Event application order is always sequence order; timestamps determine playback delay only.
- Returning to Live moves the cursor to the current live head and restores native interaction.
- The source session log remains immutable.
- Historical continuation, filesystem rollback, process restoration, and external-side-effect reversal are outside the replay contract.
- Harmony patches target exact installed bundle versions and fail closed on selector drift.

## Brand Commitments

The product name is Bites the Dust. UI additions inherit the native DSH visual system and terminology rather than creating a separate panel or visual identity.

## Evidence on Hand

The installed DSH `0.1.0-rc.8` runtime publicly exposes raw conversation event definitions, view builders, header action slots, and composer blocking. The native ChatView remains the visual authority and is the only reading surface that requires a Harmony adapter for historical projection.

## Product Principles

- Read-only means no session-changing interaction remains reachable during replay.
- One event log, one cursor, and one controller remain the only sources of playback truth.
- Extend the native conversation instead of adding a parallel surface.
- Prefer public DSH extension points; use Harmony only at the missing read-projection boundary.
- Ship each layer working end to end before adding richer timeline behavior.

