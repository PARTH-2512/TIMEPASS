# Backend Decision: Which API is Canonical for AI Detections?

> **Status: OPEN — team decision required before wiring real AI pipeline detections.**

---

## The Two Backends (side by side)

| Property | This Express Server | Python FastAPI (Caught-In-4K) |
|---|---|---|
| **Base URL** | `http://localhost:3000` | `http://localhost:8000` (or separate host) |
| **Ingest endpoint** | `POST /api/sightings` | `POST /api/v1/sightings` |
| **Field naming** | `camelCase` | `snake_case` |
| **plateNumber field** | `plateNumber` | `plate_number` |
| **cameraId field** | `cameraId` | `camera_id` |
| **detectionConfidence** | `detectionConfidence` | `detection_confidence` |
| **Language / stack** | TypeScript, Express, JSON file DB | Python, FastAPI, (DB TBD) |
| **Current wiring** | Camera Registry, Alerts, Watchlist UI | YOLO + OCR AI pipeline POSTs |
| **Real-time events** | `GET /api/live/events` (SSE) | none yet |

Neither backend currently bridges to the other. The YOLO/OCR pipeline posts to FastAPI.
The IVMAP frontend reads from Express. **They are not connected.**

---

## What Needs a Decision

The team must confirm **one** of the following before this work is complete:

### Option A: Express server is canonical
- The Python AI pipeline must be updated to POST to `http://<ivmap-host>:3000/api/sightings`
  with camelCase field names.
- The `LiveStreamGuideModal` Python snippet already shows the correct endpoint.
- WHEP/WebRTC URLs would be note-only (see below); HLS remains the browser path.

### Option B: Python FastAPI is canonical
- The Express server's ingest routes (`POST /api/sightings`, `POST /api/detections`) become
  thin proxies or are deprecated.
- The React frontend's `api.ts` must be updated to call `/api/v1/sightings` with snake_case field
  mapping.
- The SSE live event stream would need to be replicated or bridged.

### Option C: Both coexist with a bridge
- A lightweight bridge (e.g. a webhook or message queue) syncs confirmed detections
  from FastAPI into the Express store for the UI to consume.
- This is the most work but preserves both stacks independently.

---

## WebRTC / WHEP — Future Option, Not Current

The shared CCTV grid exposes a WHEP endpoint per camera:

```
http://<host>:8889/stream/<id>/whep
```

WHEP provides lower latency than HLS (~0.5–2 s vs. 4–10 s). It is **not implemented** in
this pass (HLS via `hls.js` is sufficient for dashboards and surveillance review). If latency
becomes a requirement, WHEP playback can be added to `LiveVideoPlayer.tsx` using the
[`@eyevinn/whep-player`](https://www.npmjs.com/package/@eyevinn/whep-player) or a raw
`RTCPeerConnection` + HTTP PUT flow. The `LiveStreamGuideModal` documents it as a future option.

---

## RTSP — AI Pipeline Only (out of scope for this Node/React repo)

The grid's RTSP endpoint (`rtsp://<host>:8554/stream/<id>`) is consumed by the **Python**
AI pipeline, not by this app. The same grid rules apply there:

- Force TCP transport (`rtsp_transport=tcp`)
- Drive all timing from PTS, never wall-clock
- Reconnect with exponential backoff (start ~2 s, cap ~30 s)
- Tolerate mid-GOP join decoder warnings on connect
- Tolerate non-uniform frame intervals
- Recover from hard scene cuts at the recording loop point
- Mixed codecs per camera — read codec from `/api/ingest`, don't assume H264 everywhere

This is a **Python task** (separate repo) — not implemented here.

---

## References

- Express routes: [`server.ts`](../server.ts) — `/api/sightings`, `/api/detections`, `/api/live-grid/*`
- Ingest field contract: [`src/server/db.ts`](../src/server/db.ts) — `addSighting()` method
- Grid catalogue proxy: `GET /api/live-grid/cameras`, `POST /api/live-grid/sync`
- FastAPI contract: Caught-In-4K repo, `POST /api/v1/sightings` (snake_case fields)
