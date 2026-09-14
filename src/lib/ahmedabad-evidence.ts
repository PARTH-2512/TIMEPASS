/**
 * Ahmedabad Road & Vehicle ANPR Evidence Generator
 * Produces authentic surveillance frames featuring Ahmedabad roads (S.G. Highway, Riverfront, Ashram Road),
 * Indian vehicle silhouettes, High-Security Registration Plates (HSRP Gujarat/IND), and YOLOv8 + OCR reticles.
 */

export interface AhmedabadEvidenceParams {
  plate: string;
  cameraName?: string;
  location?: string;
  timestamp?: string;
  vehicleType?: string;
  vehicleColor?: string;
  isAlert?: boolean;
  matchType?: 'exact' | 'possible' | 'none';
  matchedWatchlistPlate?: string;
  detectionConfidence?: number;
  ocrConfidence?: number;
  aggregationAgreement?: string;
  speedKmh?: number;
  trackingId?: string;
  backgroundType?: 'sg_highway' | 'riverfront' | 'ashram_road' | 'plate_closeup';
}

/**
 * Format raw plate text into official Indian High Security Registration Plate (HSRP) spacing
 * e.g. 'GJ01AB1234' -> 'GJ 01 AB 1234', 'DL3CAM1234' -> 'DL 3C AM 1234'
 */
export function formatIndianPlate(rawPlate: string): string {
  if (!rawPlate) return 'GJ 01 AB 1234';
  const clean = rawPlate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Standard Indian pattern: State (2) + District/RTO (2) + Series (1-2) + Number (4)
  const matchStd = clean.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (matchStd) {
    return `${matchStd[1]} ${matchStd[2].padStart(2, '0')} ${matchStd[3]} ${matchStd[4]}`;
  }
  
  // Custom or watchlist plates like DL3CAM1234 -> DL 3C AM 1234
  if (clean.length === 10) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
  }
  if (clean.length >= 8) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4)}`;
  }
  return clean;
}

/**
 * Generate an authentic Ahmedabad CCTV Evidence Frame with Indian vehicle and ANPR OCR overlay
 */
export function generateAhmedabadEvidenceFrame(params: AhmedabadEvidenceParams): string {
  const {
    plate,
    cameraName = 'S.G. Highway Junction North',
    location = 'Ahmedabad Grid Sector 4 (Entry Inbound)',
    timestamp = 'Today, 10:45:12 AM IST',
    vehicleType = 'Sedan',
    vehicleColor = '#475569',
    isAlert = false,
    matchType = 'none',
    matchedWatchlistPlate,
    detectionConfidence = 96.4,
    ocrConfidence = 94.8,
    aggregationAgreement = '13/16 (81.2%)',
    speedKmh = 56,
    trackingId = 'TRK-402',
    backgroundType,
  } = params;

  const formattedPlate = formatIndianPlate(plate);
  const isMatchHit = isAlert || matchType === 'exact';
  const isPossibleMatch = matchType === 'possible';

  // Choose bounding reticle color
  const reticleColor = isMatchHit ? '#ef4444' : isPossibleMatch ? '#f59e0b' : '#10b981';
  const reticleBg = isMatchHit ? '#7f1d1d' : isPossibleMatch ? '#78350f' : '#064e3b';
  const statusLabel = isMatchHit
    ? 'MATCHED WATCHLIST'
    : isPossibleMatch
    ? `POSSIBLE MATCH (${matchedWatchlistPlate || 'FUZZY'})`
    : 'VERIFIED DETECTION';

  // Pick Ahmedabad road background image based on location or param
  let bgImageUrl = '/images/ahmedabad_traffic_feed.jpg';
  const locLower = (location + ' ' + cameraName).toLowerCase();

  if (backgroundType === 'riverfront' || locLower.includes('riverfront') || locLower.includes('ellis')) {
    bgImageUrl = '/images/ahmedabad_riverfront_cctv.jpg';
  } else if (backgroundType === 'plate_closeup' || isPossibleMatch) {
    bgImageUrl = '/images/ahmedabad_plate_ocr.jpg';
  } else if (locLower.includes('ashram') || locLower.includes('sarkhej')) {
    bgImageUrl = '/images/ahmedabad_traffic_feed.jpg';
  }

  // Bounding box dimensions (SVG coordinates 640x360)
  const isCloseup = bgImageUrl.includes('plate_ocr');
  const boxX = isCloseup ? 140 : 180;
  const boxY = isCloseup ? 110 : 140;
  const boxW = isCloseup ? 360 : 280;
  const boxH = isCloseup ? 180 : 155;

  // Indian License Plate Holder (HSRP) coordinates
  const plateX = isCloseup ? 220 : 270;
  const plateY = isCloseup ? 225 : 240;
  const plateW = isCloseup ? 200 : 130;
  const plateH = isCloseup ? 48 : 34;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
    <defs>
      <!-- Scanline CRT pattern -->
      <pattern id="scanlines" width="100" height="4" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="100" y2="0" stroke="#000000" stroke-width="1.2" opacity="0.45"/>
      </pattern>
      <!-- Vignette shadow -->
      <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.75"/>
      </radialGradient>
      <!-- Car silhouette gradient (fallback) -->
      <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
    </defs>

    <!-- Base Background (Fallback color in case image is loading) -->
    <rect width="640" height="360" fill="url(#roadGrad)"/>

    <!-- Authentic Ahmedabad Road Surveillance Photo -->
    <image href="${bgImageUrl}" x="0" y="0" width="640" height="360" preserveAspectRatio="xMidYMid slice" opacity="0.95"/>

    <!-- Subtle Scanline & Optical Vignette overlay -->
    <rect width="640" height="360" fill="url(#scanlines)" pointer-events="none"/>
    <rect width="640" height="360" fill="url(#vignette)" pointer-events="none"/>

    <!-- YOLOv8 Vehicle Bounding Box -->
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" fill="none" stroke="${reticleColor}" stroke-width="2.5" stroke-dasharray="8,4"/>
    
    <!-- Vehicle Reticle Corner Brackets -->
    <path d="M${boxX} ${boxY + 20} L${boxX} ${boxY} L${boxX + 20} ${boxY}" fill="none" stroke="${reticleColor}" stroke-width="4"/>
    <path d="M${boxX + boxW - 20} ${boxY} L${boxX + boxW} ${boxY} L${boxX + boxW} ${boxY + 20}" fill="none" stroke="${reticleColor}" stroke-width="4"/>
    <path d="M${boxX} ${boxY + boxH - 20} L${boxX} ${boxY + boxH} L${boxX + 20} ${boxY + boxH}" fill="none" stroke="${reticleColor}" stroke-width="4"/>
    <path d="M${boxX + boxW - 20} ${boxY + boxH} L${boxX + boxW} ${boxY + boxH} L${boxX + boxW} ${boxY + boxH - 20}" fill="none" stroke="${reticleColor}" stroke-width="4"/>

    <!-- Vehicle Class Tag -->
    <rect x="${boxX}" y="${boxY - 20}" width="150" height="18" fill="${reticleBg}" opacity="0.95"/>
    <text x="${boxX + 6}" y="${boxY - 7}" fill="#ffffff" font-family="monospace" font-size="10" font-weight="bold">CLASS: ${vehicleType.toUpperCase()}</text>

    <!-- INDIAN HIGH SECURITY REGISTRATION PLATE (HSRP) -->
    <g id="hsrp-plate">
      <!-- Outer Plate Frame & Shadow -->
      <rect x="${plateX - 2}" y="${plateY - 2}" width="${plateW + 4}" height="${plateH + 4}" rx="4" fill="#000000" opacity="0.7"/>
      <rect x="${plateX}" y="${plateY}" width="${plateW}" height="${plateH}" rx="3" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
      
      <!-- Left Blue Strip (MoRTH Standard IND High Security Plate) -->
      <rect x="${plateX}" y="${plateY}" width="${isCloseup ? 24 : 16}" height="${plateH}" rx="2" fill="#1e3a8a"/>
      <!-- Ashoka Chakra Emblem Circle -->
      <circle cx="${plateX + (isCloseup ? 12 : 8)}" cy="${plateY + (isCloseup ? 16 : 11)}" r="${isCloseup ? 6 : 4}" fill="none" stroke="#60a5fa" stroke-width="1"/>
      <text x="${plateX + (isCloseup ? 12 : 8)}" y="${plateY + (isCloseup ? 36 : 26)}" fill="#ffffff" font-family="sans-serif" font-size="${isCloseup ? 9 : 6}" font-weight="900" text-anchor="middle">IND</text>

      <!-- Hologram Laser Security Sticker -->
      <rect x="${plateX + (isCloseup ? 28 : 20)}" y="${plateY + 3}" width="${isCloseup ? 10 : 7}" height="${isCloseup ? 10 : 7}" fill="#0284c7" opacity="0.85"/>

      <!-- Embossed Indian License Plate Number -->
      <text x="${plateX + (isCloseup ? 116 : 74)}" y="${plateY + (isCloseup ? 31 : 23)}" fill="#090d16" font-family="'Courier New', monospace, monospace" font-size="${isCloseup ? 19 : 13}" font-weight="900" letter-spacing="${isCloseup ? 2 : 1}" text-anchor="middle">
        ${formattedPlate}
      </text>

      <!-- Plate Fixing Screw Rivets -->
      <circle cx="${plateX + (isCloseup ? 34 : 24)}" cy="${plateY + plateH / 2}" r="${isCloseup ? 3 : 2}" fill="#94a3b8" stroke="#334155" stroke-width="1"/>
      <circle cx="${plateX + plateW - (isCloseup ? 12 : 8)}" cy="${plateY + plateH / 2}" r="${isCloseup ? 3 : 2}" fill="#94a3b8" stroke="#334155" stroke-width="1"/>
    </g>

    <!-- ANPR OCR INSPECTION CROP BOX -->
    <rect x="${plateX - 10}" y="${plateY - 8}" width="${plateW + 20}" height="${plateH + 16}" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="4,2"/>
    <!-- OCR Corner crosshairs -->
    <path d="M${plateX - 14} ${plateY + plateH / 2} L${plateX - 6} ${plateY + plateH / 2}" stroke="#38bdf8" stroke-width="2"/>
    <path d="M${plateX + plateW + 6} ${plateY + plateH / 2} L${plateX + plateW + 14} ${plateY + plateH / 2}" stroke="#38bdf8" stroke-width="2"/>

    <!-- OCR Crop Telemetry Floating Label -->
    <rect x="${plateX - 10}" y="${plateY - 24}" width="${isCloseup ? 220 : 160}" height="15" rx="2" fill="#0284c7" opacity="0.95"/>
    <text x="${plateX - 5}" y="${plateY - 13}" fill="#ffffff" font-family="monospace" font-size="9" font-weight="bold">
      OCR CROP: ${plate} [CONF: ${ocrConfidence}%]
    </text>

    <!-- UPPER SURVEILLANCE HUD BAR -->
    <rect x="0" y="0" width="640" height="34" fill="#030712" opacity="0.92"/>
    <circle cx="16" cy="17" r="4.5" fill="#ef4444"/>
    <text x="28" y="21" fill="#f8fafc" font-family="sans-serif" font-size="10.5" font-weight="bold">
      AHMEDABAD TRAFFIC SURVEILLANCE &bull; IVMAP GRID
    </text>
    <text x="370" y="21" fill="#38bdf8" font-family="monospace" font-size="10" font-weight="bold">
      ${cameraName}
    </text>
    <text x="545" y="21" fill="#cbd5e1" font-family="monospace" font-size="10">
      ${timestamp}
    </text>

    <!-- LOCATION SUB-BANNER -->
    <rect x="0" y="34" width="640" height="18" fill="#090d16" opacity="0.8"/>
    <text x="16" y="46" fill="#94a3b8" font-family="sans-serif" font-size="9.5">
      LOC: ${location} &bull; GPS: 23.0338° N, 72.5126° E (Gujarat, India)
    </text>
    <text x="520" y="46" fill="#a78bfa" font-family="monospace" font-size="9" font-weight="bold">
      CONSENSUS: ${aggregationAgreement}
    </text>

    <!-- LOWER TELEMETRY HUD BAR -->
    <rect x="0" y="324" width="640" height="36" fill="#030712" opacity="0.92"/>
    
    <!-- Status Tag Pill -->
    <rect x="14" y="331" width="${isMatchHit ? 140 : isPossibleMatch ? 190 : 130}" height="22" rx="4" fill="${reticleBg}"/>
    <text x="${isMatchHit ? 84 : isPossibleMatch ? 109 : 79}" y="346" fill="#f8fafc" font-family="sans-serif" font-size="9.5" font-weight="bold" text-anchor="middle">
      ${statusLabel}
    </text>

    <!-- Telemetry Readouts -->
    <text x="${isMatchHit ? 165 : isPossibleMatch ? 215 : 155}" y="346" fill="#38bdf8" font-family="monospace" font-size="10">
      SPEED: ${speedKmh} KM/H
    </text>
    <text x="${isMatchHit ? 275 : isPossibleMatch ? 325 : 265}" y="346" fill="#a3e635" font-family="monospace" font-size="10">
      TRACK: ${trackingId}
    </text>
    <text x="440" y="346" fill="#f1f5f9" font-family="monospace" font-size="10">
      DET: ${detectionConfidence}% | OCR: ${ocrConfidence}%
    </text>
  </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
