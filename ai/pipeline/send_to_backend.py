"""
The HTTP bridge: AI pipeline --POST--> Express backend (port 3000).
Detections immediately trigger live SSE toasts and dashboard updates in the UI.
Non-fatal on failure so your AI run doesn't crash if the backend isn't
up yet - it just prints a warning and keeps processing the video.
"""

import os
import requests

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3000/api/sightings")


def send_sighting(sighting: dict, timeout: float = 5.0):
    try:
        # Guarantee both camelCase and snake_case for maximum compatibility
        payload = dict(sighting)
        if "plateNumber" not in payload and "plate_number" in payload:
            payload["plateNumber"] = payload["plate_number"]
        if "cameraId" not in payload and "camera_id" in payload:
            payload["cameraId"] = payload["camera_id"]

        response = requests.post(BACKEND_URL, json=payload, timeout=timeout)
        response.raise_for_status()
        result = response.json()

        plate = (
            result.get("plate_number")
            or result.get("sighting", {}).get("plateNumber")
            or payload.get("plate_number")
            or payload.get("plateNumber")
        )
        alert = result.get("alert")
        is_match = bool(result.get("watchlist_match") or alert or result.get("matchResult", {}).get("isMatch"))

        if is_match and alert:
            matched_plate = alert.get("matched_plate") or alert.get("matchedWatchlistPlate")
            match_type = alert.get("match_type") or alert.get("matchType")
            status = alert.get("status", "new")
            priority = alert.get("priority", "high")

            if match_type == "possible":
                print(f"  [!] POSSIBLE MATCH: {plate} "
                      f"(verify against watchlist plate {matched_plate}) "
                      f"-> {status} ({priority})")
            else:
                print(f"  [*] WATCHLIST MATCH: {plate} "
                      f"-> {status} ({priority})")
        else:
            print(f"  Stored sighting: {plate} (no watchlist match)")
        return result
    except requests.exceptions.ConnectionError:
        print(f"  [backend not reachable at {BACKEND_URL} - "
              f"ensure 'npm run dev' is running on port 3000]")
        return None
    except requests.exceptions.RequestException as e:
        print(f"  [backend rejected sighting: {e}]")
        return None