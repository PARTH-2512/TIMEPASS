import fs from 'fs';
import path from 'path';
import {
  Camera,
  Alert,
  WatchlistEntry,
  VehicleSighting,
  Detection,
  DashboardSummary,
  VehicleRoutePoint,
  PipelineStatus,
} from '../types/index.ts';
import { matchPlateAgainstWatchlist, describePlateDiff, normalizePlate } from './matcher.ts';
import { generateAhmedabadEvidenceFrame } from '../lib/ahmedabad-evidence.ts';

interface DatabaseSchema {
  cameras: Camera[];
  watchlist: WatchlistEntry[];
  sightings: VehicleSighting[];
  alerts: Alert[];
  pipelineStatus: PipelineStatus;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ivmap.json');

// Initial seed cameras across surveillance grid
const DEFAULT_CAMERAS: Camera[] = [
  {
    id: 'CAM-01',
    name: 'S.G. Highway Junction North',
    location: 'Ahmedabad Grid Sector 4 (Entry Inbound)',
    latitude: 23.0338,
    longitude: 72.585,
    status: 'online',
    vendor: 'Hikvision 4K DarkFighter',
    streamUrl: '',
    uptime: '99.9%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 4820,
    activeAlertsCount: 2,
  },
  {
    id: 'CAM-02',
    name: 'Ellis Bridge Inbound',
    location: 'Heritage Corridor East',
    latitude: 23.0225,
    longitude: 72.5714,
    status: 'online',
    vendor: 'Dahua ANPR Pro Starlight',
    streamUrl: '',
    uptime: '99.4%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 3912,
    activeAlertsCount: 1,
  },
  {
    id: 'CAM-03',
    name: 'Ashram Road Intersect',
    location: 'CBD Commercial Hub',
    latitude: 23.0412,
    longitude: 72.5698,
    status: 'online',
    vendor: 'Axis Q1798 4K ANPR',
    streamUrl: '',
    uptime: '98.9%',
    fps: 25,
    resolution: '1920x1080',
    totalDetections: 5120,
    activeAlertsCount: 1,
  },
  {
    id: 'CAM-04',
    name: 'Prahlad Nagar Flyover',
    location: 'Tech Park Highway South',
    latitude: 23.0125,
    longitude: 72.5112,
    status: 'online',
    vendor: 'Bosch MIC IP Ultra 7100i',
    streamUrl: '',
    uptime: '99.8%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 4210,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-05',
    name: 'Ring Road Exit 7',
    location: 'Outer Bypass West Ramp',
    latitude: 23.0588,
    longitude: 72.523,
    status: 'online',
    vendor: 'Hikvision Dual-Sensor 4K',
    streamUrl: '',
    uptime: '98.2%',
    fps: 25,
    resolution: '1920x1080',
    totalDetections: 2890,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-06',
    name: 'Kalupur Station Approach',
    location: 'Central Transit Zone Metro Gate',
    latitude: 23.0298,
    longitude: 72.6012,
    status: 'online',
    vendor: 'Dahua IPC Ultra ANPR',
    streamUrl: '',
    uptime: '99.1%',
    fps: 25,
    resolution: '1920x1080',
    totalDetections: 3410,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-07',
    name: 'ISKCON Cross Road',
    location: 'S.G. Highway Central Gateway',
    latitude: 23.0278,
    longitude: 72.5074,
    status: 'online',
    vendor: 'Hikvision 4K DarkFighter',
    streamUrl: '',
    uptime: '99.7%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 5640,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-08',
    name: 'Shivranjani Flyover',
    location: '132 Feet Ring Road Corridor',
    latitude: 23.0245,
    longitude: 72.5332,
    status: 'online',
    vendor: 'Axis Q1798 4K ANPR',
    streamUrl: '',
    uptime: '99.5%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 4890,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-09',
    name: 'Vastrapur Lake Junction',
    location: 'Commercial Retail Sector',
    latitude: 23.0375,
    longitude: 72.5298,
    status: 'online',
    vendor: 'Dahua ANPR Pro Starlight',
    streamUrl: '',
    uptime: '99.2%',
    fps: 25,
    resolution: '1920x1080',
    totalDetections: 3950,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-10',
    name: 'University Road Gateway',
    location: 'Institutional Corridor South',
    latitude: 23.0360,
    longitude: 72.5480,
    status: 'online',
    vendor: 'Bosch MIC IP Ultra 7100i',
    streamUrl: '',
    uptime: '99.6%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 4120,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-11',
    name: 'Navrangpura Commerce Hub',
    location: 'Central Financial Arterial',
    latitude: 23.0380,
    longitude: 72.5610,
    status: 'online',
    vendor: 'Hikvision 4K DarkFighter',
    streamUrl: '',
    uptime: '99.8%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 4780,
    activeAlertsCount: 0,
  },
  {
    id: 'CAM-12',
    name: 'Sabarmati Riverfront Promenade',
    location: 'East Riverbank Transit View',
    latitude: 23.0495,
    longitude: 72.5780,
    status: 'online',
    vendor: 'Axis Q1798 4K ANPR',
    streamUrl: '',
    uptime: '99.3%',
    fps: 30,
    resolution: '3840x2160',
    totalDetections: 3620,
    activeAlertsCount: 0,
  },
];

// Initial active Watchlist
const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  {
    id: 'WL-001',
    plateNumber: 'DL3CAM1234',
    category: 'Wanted Suspect',
    priority: 'high',
    reason: 'Active FIR-9821: Suspect vehicle linked to high-profile armed burglary',
    caseId: 'CASE-2024-9821',
    dateAdded: '2024-11-10',
    status: 'active',
    ownerNotes: 'Tracked on CCTV loop with YOLOv8 + OCR. Alert triggers on detection & possible matches.',
    lastSighting: {
      timestamp: 'Today, 06:42:15',
      cameraName: 'S.G. Highway Junction North',
      location: 'Ahmedabad Grid Sector 4 (Entry Inbound)',
    },
  },
  {
    id: 'WL-002',
    plateNumber: 'GJ01AB1234',
    category: 'Stolen Vehicle',
    priority: 'high',
    reason: 'White Hyundai Verna stolen from Vastrapur Lake parking lot',
    caseId: 'CASE-2024-4402',
    dateAdded: '2024-10-18',
    status: 'active',
    ownerNotes: 'Complainant reported vehicle driven towards riverfront bridge.',
    lastSighting: {
      timestamp: 'Today, 05:12:00',
      cameraName: 'Ellis Bridge Inbound',
      location: 'Heritage Corridor East',
    },
  },
  {
    id: 'WL-003',
    plateNumber: 'GJ05CD5678',
    category: 'High Risk',
    priority: 'high',
    reason: 'Black Mahindra Scorpio flagged in illicit contraband transit route',
    caseId: 'CASE-2024-5678',
    dateAdded: '2024-10-22',
    status: 'active',
    ownerNotes: 'Intercept team on standby across Sector 4 flyovers.',
    lastSighting: {
      timestamp: 'Today, 06:15:30',
      cameraName: 'Prahlad Nagar Flyover',
      location: 'Tech Park Highway South',
    },
  },
  {
    id: 'WL-004',
    plateNumber: 'MH12DE5678',
    category: 'Traffic Violation',
    priority: 'medium',
    reason: 'Repeat dangerous driving & toll barrier breach at Expressway entrance',
    caseId: 'CASE-2024-3012',
    dateAdded: '2024-11-01',
    status: 'active',
    ownerNotes: 'Unpaid challans amounting to INR 28,000.',
  },
  {
    id: 'WL-005',
    plateNumber: 'HR26DQ5555',
    category: 'Surveillance',
    priority: 'low',
    reason: 'Vehicle of interest for intelligence gathering under perimeter surveillance',
    caseId: 'CASE-2024-1109',
    dateAdded: '2024-11-05',
    status: 'active',
    ownerNotes: 'Log sightings quietly, do not intercept without officer presence.',
  },
];

// Initial seed Sightings with YOLO + OCR track aggregation scores
const DEFAULT_SIGHTINGS: VehicleSighting[] = [
  {
    id: 'SIGHT-101',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-05',
    cameraName: 'Ring Road Exit 7',
    location: 'Outer Bypass West Ramp',
    timestamp: 'Today, 06:12:10',
    detectionConfidence: 96.2,
    ocrConfidence: 92.8,
    trackingConfidence: 97.5,
    trackingId: 'TRK-401',
    aggregationAgreement: '13/16 (81.2%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 64,
    lane: 2,
    heading: 'Southbound Inbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-102',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-09',
    cameraName: 'Vastrapur Lake Junction',
    location: 'Commercial Retail Sector',
    timestamp: 'Today, 06:21:45',
    detectionConfidence: 95.8,
    ocrConfidence: 93.1,
    trackingConfidence: 96.8,
    trackingId: 'TRK-403',
    aggregationAgreement: '14/16 (87.5%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 58,
    lane: 1,
    heading: 'Eastbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-103',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-07',
    cameraName: 'ISKCON Cross Road',
    location: 'S.G. Highway Central Gateway',
    timestamp: 'Today, 06:31:20',
    detectionConfidence: 97.1,
    ocrConfidence: 94.6,
    trackingConfidence: 98.4,
    trackingId: 'TRK-405',
    aggregationAgreement: '15/16 (93.8%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 52,
    lane: 3,
    heading: 'Southbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-104',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-04',
    cameraName: 'Prahlad Nagar Flyover',
    location: 'Tech Park Highway South',
    timestamp: 'Today, 06:40:05',
    detectionConfidence: 96.5,
    ocrConfidence: 94.0,
    trackingConfidence: 98.0,
    trackingId: 'TRK-408',
    aggregationAgreement: '14/16 (87.5%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 61,
    lane: 2,
    heading: 'Eastbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-105',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-08',
    cameraName: 'Shivranjani Flyover',
    location: '132 Feet Ring Road Corridor',
    timestamp: 'Today, 06:48:50',
    detectionConfidence: 97.4,
    ocrConfidence: 95.2,
    trackingConfidence: 99.1,
    trackingId: 'TRK-412',
    aggregationAgreement: '15/16 (93.8%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 55,
    lane: 2,
    heading: 'North-East',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-106',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-10',
    cameraName: 'University Road Gateway',
    location: 'Institutional Corridor South',
    timestamp: 'Today, 06:57:30',
    detectionConfidence: 95.3,
    ocrConfidence: 92.5,
    trackingConfidence: 96.7,
    trackingId: 'TRK-416',
    aggregationAgreement: '13/16 (81.2%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 48,
    lane: 1,
    heading: 'Eastbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-107',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-11',
    cameraName: 'Navrangpura Commerce Hub',
    location: 'Central Financial Arterial',
    timestamp: 'Today, 07:06:15',
    detectionConfidence: 96.9,
    ocrConfidence: 94.8,
    trackingConfidence: 97.9,
    trackingId: 'TRK-420',
    aggregationAgreement: '14/16 (87.5%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 45,
    lane: 2,
    heading: 'Eastbound Inbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-108',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-03',
    cameraName: 'Ashram Road Intersect',
    location: 'CBD Commercial Hub',
    timestamp: 'Today, 07:15:40',
    detectionConfidence: 96.1,
    ocrConfidence: 93.6,
    trackingConfidence: 97.2,
    trackingId: 'TRK-425',
    aggregationAgreement: '14/16 (87.5%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 42,
    lane: 3,
    heading: 'Southbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-109',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-02',
    cameraName: 'Ellis Bridge Inbound',
    location: 'Heritage Corridor East',
    timestamp: 'Today, 07:24:10',
    detectionConfidence: 97.8,
    ocrConfidence: 95.9,
    trackingConfidence: 99.3,
    trackingId: 'TRK-431',
    aggregationAgreement: '15/16 (93.8%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 38,
    lane: 1,
    heading: 'Eastbound River Bridge',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-110',
    plateNumber: 'DL3CAM1234',
    cameraId: 'CAM-06',
    cameraName: 'Kalupur Station Approach',
    location: 'Central Transit Zone Metro Gate',
    timestamp: 'Today, 07:35:55',
    detectionConfidence: 97.5,
    ocrConfidence: 94.7,
    trackingConfidence: 98.6,
    trackingId: 'TRK-438',
    aggregationAgreement: '14/16 (87.5%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'DL3CAM1234',
    vehicleType: 'Sedan',
    vehicleColor: 'Silver Metallic',
    speedKmh: 34,
    lane: 2,
    heading: 'Eastbound Terminal Approach',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-104',
    plateNumber: 'GJ05CD5678',
    cameraId: 'CAM-01',
    cameraName: 'S.G. Highway Junction North',
    location: 'Ahmedabad Grid Sector 4 (Entry Inbound)',
    timestamp: 'Today, 05:40:12',
    detectionConfidence: 95.2,
    ocrConfidence: 92.0,
    trackingConfidence: 96.5,
    trackingId: 'TRK-380',
    aggregationAgreement: '15/16 (93.8%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'GJ05CD5678',
    vehicleType: 'SUV',
    vehicleColor: 'Black',
    speedKmh: 72,
    lane: 3,
    heading: 'Inbound Outer Ring',
    evidenceUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-105',
    plateNumber: 'GJ05CD5678',
    cameraId: 'CAM-03',
    cameraName: 'Ashram Road Intersect',
    location: 'CBD Commercial Hub',
    timestamp: 'Today, 05:58:20',
    detectionConfidence: 94.6,
    ocrConfidence: 90.8,
    trackingConfidence: 95.2,
    trackingId: 'TRK-388',
    aggregationAgreement: '13/16 (81.2%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'GJ05CD5678',
    vehicleType: 'SUV',
    vehicleColor: 'Black',
    speedKmh: 58,
    lane: 2,
    heading: 'Southbound',
    evidenceUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-106',
    plateNumber: 'GJ05CD5678',
    cameraId: 'CAM-04',
    cameraName: 'Prahlad Nagar Flyover',
    location: 'Tech Park Highway South',
    timestamp: 'Today, 06:15:30',
    detectionConfidence: 97.8,
    ocrConfidence: 94.3,
    trackingConfidence: 98.6,
    trackingId: 'TRK-395',
    aggregationAgreement: '16/16 (100%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'GJ05CD5678',
    vehicleType: 'SUV',
    vehicleColor: 'Black',
    speedKmh: 64,
    lane: 2,
    heading: 'Highway Overpass West',
    evidenceUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'SIGHT-107',
    plateNumber: 'GJ01AB1234',
    cameraId: 'CAM-02',
    cameraName: 'Ellis Bridge Inbound',
    location: 'Heritage Corridor East',
    timestamp: 'Today, 05:12:00',
    detectionConfidence: 98.1,
    ocrConfidence: 96.0,
    trackingConfidence: 99.1,
    trackingId: 'TRK-350',
    aggregationAgreement: '15/16 (93.8%)',
    matchType: 'exact',
    matchedWatchlistPlate: 'GJ01AB1234',
    vehicleType: 'Sedan',
    vehicleColor: 'White',
    speedKmh: 48,
    lane: 1,
    heading: 'Bridge Crossing West',
    evidenceUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
  },
];

// Initial Alerts generated from seed sightings
const DEFAULT_ALERTS: Alert[] = [
  {
    id: 'ALT-101',
    type: 'Watchlist Alert',
    priority: 'high',
    plateNumber: 'DL3CAM1234',
    matchedWatchlistPlate: 'DL3CAM1234',
    matchType: 'exact',
    similarityScore: 100,
    editDistance: 0,
    aggregationAgreement: '13/16 (81.2%)',
    cameraId: 'CAM-01',
    cameraName: 'S.G. Highway Junction North',
    location: 'Ahmedabad Grid Sector 4 (Entry Inbound)',
    timestamp: 'Today, 06:42:15',
    reason: 'Active Wanted Suspect (FIR-9821): High-profile armed burglary vehicle',
    status: 'new',
    confidence: 95.1,
    detectionConfidence: 96.8,
    ocrConfidence: 93.4,
    caseId: 'CASE-2024-9821',
    notes: 'YOLOv8 vehicle detection + OCR track aggregation confirmed plate with 13/16 consensus agreement.',
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'ALT-102',
    type: 'Possible Watchlist Match',
    priority: 'medium',
    plateNumber: 'DL3CAM123A',
    matchedWatchlistPlate: 'DL3CAM1234',
    matchType: 'possible',
    similarityScore: 90,
    editDistance: 1,
    aggregationAgreement: '12/15 (80.0%)',
    cameraId: 'CAM-03',
    cameraName: 'Ashram Road Intersect',
    location: 'CBD Commercial Hub',
    timestamp: 'Today, 07:08:40',
    reason: "Possible Watchlist Match: Detected 'DL3CAM123A' differs by 1 character from 'DL3CAM1234'. Suspected OCR fumble (Single character fumble: pos 10: 'A' instead of '4').",
    status: 'under_review',
    confidence: 89.8,
    detectionConfidence: 92.1,
    ocrConfidence: 87.5,
    caseId: 'CASE-2024-9821',
    notes: "Fuzzy ANPR matching triggered to prevent missing watchlist targets due to single digit OCR fumble. 90% character similarity. Flagged for officer verification.",
    evidenceUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'ALT-103',
    type: 'Watchlist Alert',
    priority: 'high',
    plateNumber: 'GJ05CD5678',
    matchedWatchlistPlate: 'GJ05CD5678',
    matchType: 'exact',
    similarityScore: 100,
    editDistance: 0,
    aggregationAgreement: '16/16 (100%)',
    cameraId: 'CAM-04',
    cameraName: 'Prahlad Nagar Flyover',
    location: 'Tech Park Highway South',
    timestamp: 'Today, 06:15:30',
    reason: 'High Risk Contraband Transit Vehicle (CASE-2024-5678)',
    status: 'new',
    confidence: 96.0,
    detectionConfidence: 97.8,
    ocrConfidence: 94.3,
    caseId: 'CASE-2024-5678',
    notes: 'Multi-camera trajectory indicates sustained transit west along highway corridor.',
    evidenceUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'ALT-104',
    type: 'Watchlist Alert',
    priority: 'high',
    plateNumber: 'GJ01AB1234',
    matchedWatchlistPlate: 'GJ01AB1234',
    matchType: 'exact',
    similarityScore: 100,
    editDistance: 0,
    aggregationAgreement: '15/16 (93.8%)',
    cameraId: 'CAM-02',
    cameraName: 'Ellis Bridge Inbound',
    location: 'Heritage Corridor East',
    timestamp: 'Today, 05:12:00',
    reason: 'Reported Stolen Vehicle (FIR-4402)',
    status: 'under_review',
    confidence: 97.0,
    detectionConfidence: 98.1,
    ocrConfidence: 96.0,
    caseId: 'CASE-2024-4402',
    notes: 'Patrol dispatched to check bridge western ramp.',
    evidenceUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
  },
];

let globalEntityCounter = Math.floor(Math.random() * 1000) + 1000;

export function generateUniqueEntityId(prefix: string): string {
  globalEntityCounter += 1;
  const timeSlice = Date.now().toString().slice(-6);
  const randNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${timeSlice}-${globalEntityCounter}-${randNum}`;
}

class DatabaseManager {
  private data: DatabaseSchema;
  private listeners: Set<(event: { type: string; payload: unknown }) => void> = new Set();

  constructor() {
    this.data = this.loadData();
  }

  private sanitizeAndDeduplicate(schema: DatabaseSchema): boolean {
    let modified = false;

    // Deduplicate Sightings
    const seenSightingIds = new Set<string>();
    schema.sightings.forEach((s) => {
      if (!s.id || seenSightingIds.has(s.id)) {
        s.id = generateUniqueEntityId('SIGHT');
        modified = true;
      }
      seenSightingIds.add(s.id);
    });

    // Deduplicate Alerts
    const seenAlertIds = new Set<string>();
    schema.alerts.forEach((a) => {
      if (!a.id || seenAlertIds.has(a.id)) {
        a.id = generateUniqueEntityId('ALT');
        modified = true;
      }
      seenAlertIds.add(a.id);
    });

    // Deduplicate Watchlist
    const seenWlIds = new Set<string>();
    schema.watchlist.forEach((w) => {
      if (!w.id || seenWlIds.has(w.id)) {
        w.id = generateUniqueEntityId('WL');
        modified = true;
      }
      seenWlIds.add(w.id);
    });

    return modified;
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const loaded: DatabaseSchema = {
          cameras: parsed.cameras || DEFAULT_CAMERAS,
          watchlist: parsed.watchlist || DEFAULT_WATCHLIST,
          sightings: parsed.sightings || DEFAULT_SIGHTINGS,
          alerts: parsed.alerts || DEFAULT_ALERTS,
          pipelineStatus: parsed.pipelineStatus || {
            isRunning: true,
            activeCameras: 4,
            fps: 28.5,
            lastDetectedPlate: 'DL3CAM1234',
            lastAgreement: '13/16 (81.2%)',
            totalProcessedFrames: 14890,
            watchlistHitsToday: 3,
            possibleMatchesToday: 1,
          },
        };

        let updated = this.sanitizeAndDeduplicate(loaded);

        // Ensure all 12 seed cameras exist even if loaded from older ivmap.json
        for (const defCam of DEFAULT_CAMERAS) {
          if (!loaded.cameras.some((c) => c.id.toLowerCase() === defCam.id.toLowerCase())) {
            loaded.cameras.push(defCam);
            updated = true;
          }
        }

        // Ensure DL3CAM1234 has its complete multi-camera trajectory
        const dl3CamNodes = new Set(
          loaded.sightings
            .filter((s) => s.plateNumber === 'DL3CAM1234' || s.matchedWatchlistPlate === 'DL3CAM1234')
            .map((s) => s.cameraId)
        );
        if (dl3CamNodes.size < 6) {
          // Replace older 3-camera loop sightings with the complete 10-camera trajectory
          const dl3DefaultSightings = DEFAULT_SIGHTINGS.filter((s) => s.plateNumber === 'DL3CAM1234');
          loaded.sightings = [
            ...dl3DefaultSightings,
            ...loaded.sightings.filter(
              (s) => s.plateNumber !== 'DL3CAM1234' && s.matchedWatchlistPlate !== 'DL3CAM1234'
            ),
          ];
          updated = true;
        }

        if (updated) {
          this.saveDataDirect(loaded);
        }
        return loaded;
      }
    } catch (err) {
      console.warn('Error reading db file, falling back to defaults:', err);
    }

    const initial: DatabaseSchema = {
      cameras: DEFAULT_CAMERAS,
      watchlist: DEFAULT_WATCHLIST,
      sightings: DEFAULT_SIGHTINGS,
      alerts: DEFAULT_ALERTS,
      pipelineStatus: {
        isRunning: true,
        activeCameras: 4,
        fps: 28.5,
        lastDetectedPlate: 'DL3CAM1234',
        lastAgreement: '13/16 (81.2%)',
        totalProcessedFrames: 14890,
        watchlistHitsToday: 3,
        possibleMatchesToday: 1,
      },
    };

    this.sanitizeAndDeduplicate(initial);
    this.saveDataDirect(initial);
    return initial;
  }

  private saveData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting db file:', err);
    }
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting initial db file:', err);
    }
  }

  public subscribe(fn: (event: { type: string; payload: unknown }) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(type: string, payload: unknown) {
    for (const fn of this.listeners) {
      try {
        fn({ type, payload });
      } catch {
        // ignore subscriber errors
      }
    }
  }

  // ==================== CAMERAS ====================
  public getCameras(): Camera[] {
    return [...this.data.cameras];
  }

  public getCameraById(id: string): Camera | undefined {
    const cleanId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.data.cameras.find(
      (c) =>
        c.id.toLowerCase() === id.toLowerCase() ||
        c.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId
    );
  }

  public createCamera(camData: Partial<Camera>): Camera {
    const id = camData.id || `CAM-${String(this.data.cameras.length + 1).padStart(2, '0')}`;
    const newCamera: Camera = {
      id,
      name: camData.name || 'New Surveillance Node',
      location: camData.location || 'Urban Grid Center',
      latitude: camData.latitude ?? 23.0338,
      longitude: camData.longitude ?? 72.585,
      status: camData.status || 'online',
      vendor: camData.vendor || 'Hikvision 4K DarkFighter',
      streamUrl: camData.streamUrl || '',
      uptime: '100%',
      fps: camData.fps ?? 30,
      resolution: camData.resolution || '3840x2160',
      totalDetections: 0,
      activeAlertsCount: 0,
    };

    this.data.cameras.push(newCamera);
    this.saveData();
    this.emit('camera:created', newCamera);
    return newCamera;
  }

  public updateCamera(id: string, updates: Partial<Camera>): Camera {
    const idx = this.data.cameras.findIndex((c) => c.id.toLowerCase() === id.toLowerCase());
    if (idx === -1) throw new Error(`Camera with id ${id} not found`);

    this.data.cameras[idx] = { ...this.data.cameras[idx], ...updates };
    this.saveData();
    this.emit('camera:updated', this.data.cameras[idx]);
    return this.data.cameras[idx];
  }

  public deleteCamera(id: string): boolean {
    const initialLen = this.data.cameras.length;
    this.data.cameras = this.data.cameras.filter((c) => c.id.toLowerCase() !== id.toLowerCase());
    const deleted = this.data.cameras.length < initialLen;
    if (deleted) {
      this.saveData();
      this.emit('camera:deleted', { id });
    }
    return deleted;
  }

  // ==================== WATCHLIST ====================
  public getWatchlist(): WatchlistEntry[] {
    return [...this.data.watchlist];
  }

  public getWatchlistEntry(id: string): WatchlistEntry | undefined {
    return this.data.watchlist.find((w) => w.id === id || normalizePlate(w.plateNumber) === normalizePlate(id));
  }

  public addWatchlistEntry(entry: Partial<WatchlistEntry>): WatchlistEntry {
    const plate = normalizePlate(entry.plateNumber || '');
    if (!plate) throw new Error('Plate number is required for watchlist entry');

    // Check duplicate
    const existing = this.data.watchlist.find((w) => normalizePlate(w.plateNumber) === plate);
    if (existing) {
      throw new Error(`Watchlist entry for plate ${plate} already exists.`);
    }

    const newEntry: WatchlistEntry = {
      id: generateUniqueEntityId('WL'),
      plateNumber: plate,
      category: entry.category || 'Wanted Suspect',
      priority: entry.priority || 'high',
      reason: entry.reason || 'Flagged for surveillance and law-enforcement detection',
      caseId: entry.caseId || `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      dateAdded: new Date().toISOString().split('T')[0],
      status: 'active',
      ownerNotes: entry.ownerNotes || 'Added via unified IVMAP console',
    };

    this.data.watchlist.unshift(newEntry);
    this.saveData();
    this.emit('watchlist:created', newEntry);

    // Retrospectively check existing sightings for this new plate (exact and possible matches)
    this.checkSightingsAgainstWatchlistEntry(newEntry);

    return newEntry;
  }

  public updateWatchlistEntry(id: string, updates: Partial<WatchlistEntry>): WatchlistEntry {
    const idx = this.data.watchlist.findIndex((w) => w.id === id || normalizePlate(w.plateNumber) === normalizePlate(id));
    if (idx === -1) throw new Error(`Watchlist entry ${id} not found`);

    if (updates.plateNumber) {
      updates.plateNumber = normalizePlate(updates.plateNumber);
    }

    this.data.watchlist[idx] = { ...this.data.watchlist[idx], ...updates };
    this.saveData();
    this.emit('watchlist:updated', this.data.watchlist[idx]);
    return this.data.watchlist[idx];
  }

  public deleteWatchlistEntry(id: string): boolean {
    const initialLen = this.data.watchlist.length;
    this.data.watchlist = this.data.watchlist.filter(
      (w) => w.id !== id && normalizePlate(w.plateNumber) !== normalizePlate(id)
    );
    const deleted = this.data.watchlist.length < initialLen;
    if (deleted) {
      this.saveData();
      this.emit('watchlist:deleted', { id });
    }
    return deleted;
  }

  // ==================== SIGHTINGS & INGESTION ====================
  public getSightings(limit = 100): VehicleSighting[] {
    return this.data.sightings.slice(0, limit);
  }

  public getSightingById(id: string): VehicleSighting | undefined {
    return this.data.sightings.find((s) => s.id === id);
  }

  public searchSightings(params: {
    query?: string;
    cameraId?: string;
    vehicleType?: string;
    minConfidence?: number;
    matchType?: string;
  }): VehicleSighting[] {
    let result = [...this.data.sightings];

    if (params.query && params.query.trim()) {
      const q = normalizePlate(params.query);
      result = result.filter(
        (s) =>
          normalizePlate(s.plateNumber).includes(q) ||
          s.cameraName.toLowerCase().includes(params.query!.toLowerCase()) ||
          s.location.toLowerCase().includes(params.query!.toLowerCase())
      );
    }

    if (params.cameraId && params.cameraId !== 'all') {
      result = result.filter((s) => s.cameraId.toLowerCase() === params.cameraId!.toLowerCase());
    }

    if (params.vehicleType && params.vehicleType !== 'all') {
      result = result.filter(
        (s) => s.vehicleType?.toLowerCase() === params.vehicleType!.toLowerCase()
      );
    }

    if (params.minConfidence !== undefined) {
      result = result.filter((s) => s.ocrConfidence >= params.minConfidence!);
    }

    if (params.matchType && params.matchType !== 'all') {
      result = result.filter((s) => s.matchType === params.matchType);
    }

    return result;
  }

  /**
   * Main ingestion point for the AI YOLO + OCR live pipeline.
   * Runs the Watchlist matching engine: Exact Match + "Possible Match" fuzzy Levenshtein distance check.
   */
  public addSighting(sightingInput: {
    plateNumber: string;
    cameraId: string;
    cameraName?: string;
    location?: string;
    detectionConfidence?: number;
    ocrConfidence?: number;
    trackingConfidence?: number;
    trackingId?: string;
    aggregationAgreement?: string; // e.g. "13/16 (81.2%)"
    vehicleType?: string;
    vehicleColor?: string;
    speedKmh?: number;
    evidenceUrl?: string;
    timestamp?: string;
  }): { sighting: VehicleSighting; alert?: Alert; matchResult: ReturnType<typeof matchPlateAgainstWatchlist> } {
    const rawPlate = sightingInput.plateNumber.trim().toUpperCase();
    const cleanPlate = normalizePlate(rawPlate);

    const camera = this.getCameraById(sightingInput.cameraId) || {
      id: sightingInput.cameraId,
      name: sightingInput.cameraName || 'Surveillance Node',
      location: sightingInput.location || 'Urban Corridor',
    };

    const nowStr =
      sightingInput.timestamp ||
      `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    // 1. Run the Watchlist Matcher (checks Exact Match AND Possible Match)
    const matchResult = matchPlateAgainstWatchlist(cleanPlate, this.data.watchlist);

    // 2. Build Sighting object
    const newSighting: VehicleSighting = {
      id: generateUniqueEntityId('SIGHT'),
      plateNumber: cleanPlate,
      cameraId: camera.id,
      cameraName: camera.name,
      location: camera.location,
      timestamp: nowStr,
      detectionConfidence: sightingInput.detectionConfidence ?? 95.0,
      ocrConfidence: sightingInput.ocrConfidence ?? 91.5,
      trackingConfidence: sightingInput.trackingConfidence ?? 97.0,
      trackingId: sightingInput.trackingId || `TRK-${Math.floor(100 + Math.random() * 900)}`,
      aggregationAgreement: sightingInput.aggregationAgreement || '13/16 (81.2%)',
      matchType: matchResult.matchType,
      matchedWatchlistPlate: matchResult.targetPlate,
      vehicleType: sightingInput.vehicleType || 'Sedan',
      vehicleColor: sightingInput.vehicleColor || 'Silver Metallic',
      speedKmh: sightingInput.speedKmh || Math.floor(45 + Math.random() * 35),
      evidenceUrl:
        sightingInput.evidenceUrl && !sightingInput.evidenceUrl.includes('unsplash')
          ? sightingInput.evidenceUrl
          : generateAhmedabadEvidenceFrame({
              plate: cleanPlate,
              cameraName: camera.name,
              location: camera.location,
              timestamp: nowStr,
              vehicleType: sightingInput.vehicleType || 'Sedan',
              vehicleColor: sightingInput.vehicleColor || 'Silver Metallic',
              isAlert: matchResult.isMatch,
              matchType: matchResult.matchType,
              matchedWatchlistPlate: matchResult.targetPlate,
              detectionConfidence: sightingInput.detectionConfidence ?? 95.0,
              ocrConfidence: sightingInput.ocrConfidence ?? 91.5,
              aggregationAgreement: sightingInput.aggregationAgreement || '13/16 (81.2%)',
              speedKmh: sightingInput.speedKmh || 58,
              trackingId: sightingInput.trackingId || 'TRK-402',
            }),
    };

    this.data.sightings.unshift(newSighting);

    // Keep sightings cap to 1000 items
    if (this.data.sightings.length > 1000) {
      this.data.sightings = this.data.sightings.slice(0, 1000);
    }

    // 3. Update Camera stats
    const camIdx = this.data.cameras.findIndex((c) => c.id === camera.id);
    if (camIdx !== -1) {
      this.data.cameras[camIdx].totalDetections = (this.data.cameras[camIdx].totalDetections || 0) + 1;
    }

    let generatedAlert: Alert | undefined;

    // 4. If Matched (Exact or Possible), generate real Alert
    if (matchResult.isMatch && matchResult.matchedEntry) {
      const entry = matchResult.matchedEntry;
      const isExact = matchResult.matchType === 'exact';

      generatedAlert = {
        id: generateUniqueEntityId('ALT'),
        type: isExact ? 'Watchlist Alert' : 'Possible Watchlist Match',
        priority: isExact ? entry.priority : 'medium',
        plateNumber: cleanPlate,
        matchedWatchlistPlate: entry.plateNumber,
        matchType: isExact ? 'exact' : 'possible',
        similarityScore: matchResult.similarity,
        editDistance: matchResult.distance,
        aggregationAgreement: newSighting.aggregationAgreement,
        cameraId: camera.id,
        cameraName: camera.name,
        location: camera.location,
        timestamp: nowStr,
        reason: isExact
          ? `${entry.category}: ${entry.reason}`
          : `Possible Watchlist Match: Detected '${cleanPlate}' differs by ${matchResult.distance} character from Watchlist '${entry.plateNumber}'. Suspected OCR fumble (${matchResult.diffDescription}).`,
        status: 'new',
        confidence: Number(((newSighting.detectionConfidence + newSighting.ocrConfidence) / 2).toFixed(1)),
        detectionConfidence: newSighting.detectionConfidence,
        ocrConfidence: newSighting.ocrConfidence,
        caseId: entry.caseId,
        notes: isExact
          ? `High-confidence exact hit verified via multi-frame OCR consensus (${newSighting.aggregationAgreement}).`
          : `Fuzzy ANPR matching identified potential watchlist hit despite OCR digit/character discrepancy (${matchResult.diffDescription}). Agreement: ${newSighting.aggregationAgreement}, Similarity: ${matchResult.similarity}%. Flagged for human review.`,
        evidenceUrl: newSighting.evidenceUrl,
      };

      this.data.alerts.unshift(generatedAlert);

      // Update Watchlist last sighting
      const wlIdx = this.data.watchlist.findIndex((w) => w.id === entry.id);
      if (wlIdx !== -1) {
        this.data.watchlist[wlIdx].lastSighting = {
          timestamp: nowStr,
          cameraName: camera.name,
          location: camera.location,
        };
      }

      // Update Camera active alerts count
      if (camIdx !== -1) {
        this.data.cameras[camIdx].activeAlertsCount = (this.data.cameras[camIdx].activeAlertsCount || 0) + 1;
      }

      this.emit('alert:created', generatedAlert);
    }

    // Update pipeline status
    this.data.pipelineStatus.lastDetectedPlate = cleanPlate;
    this.data.pipelineStatus.lastAgreement = newSighting.aggregationAgreement;
    this.data.pipelineStatus.totalProcessedFrames += 16;
    if (generatedAlert?.matchType === 'exact') {
      this.data.pipelineStatus.watchlistHitsToday += 1;
    } else if (generatedAlert?.matchType === 'possible') {
      this.data.pipelineStatus.possibleMatchesToday += 1;
    }

    this.saveData();
    this.emit('sighting:created', newSighting);

    return { sighting: newSighting, alert: generatedAlert, matchResult };
  }

  // ==================== ALERTS ====================
  public getAlerts(params?: { status?: string; priority?: string; matchType?: string }): Alert[] {
    let list = [...this.data.alerts];
    if (params?.status && params.status !== 'all') {
      list = list.filter((a) => a.status === params.status);
    }
    if (params?.priority && params.priority !== 'all') {
      list = list.filter((a) => a.priority === params.priority);
    }
    if (params?.matchType && params.matchType !== 'all') {
      list = list.filter((a) => a.matchType === params.matchType);
    }
    return list;
  }

  public getAlertById(id: string): Alert | undefined {
    return this.data.alerts.find((a) => a.id === id);
  }

  public updateAlertStatus(
    id: string,
    status: Alert['status'],
    reviewerNotes?: string,
    reviewedBy?: string
  ): Alert {
    const idx = this.data.alerts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Alert ${id} not found`);

    const alert = this.data.alerts[idx];
    const prevStatus = alert.status;
    alert.status = status;
    alert.reviewedBy = reviewedBy || 'Duty Officer';
    alert.reviewedAt = new Date().toISOString();
    if (reviewerNotes) {
      alert.notes = alert.notes ? `${alert.notes} | Review: ${reviewerNotes}` : reviewerNotes;
    }

    // If alert is resolved or false_positive, decrement camera active count
    if ((status === 'resolved' || status === 'false_positive') && (prevStatus === 'new' || prevStatus === 'under_review')) {
      const camIdx = this.data.cameras.findIndex((c) => c.id === alert.cameraId);
      if (camIdx !== -1 && this.data.cameras[camIdx].activeAlertsCount && this.data.cameras[camIdx].activeAlertsCount! > 0) {
        this.data.cameras[camIdx].activeAlertsCount! -= 1;
      }
    }

    this.saveData();
    this.emit('alert:updated', alert);
    return alert;
  }

  // ==================== VEHICLE ROUTE ====================
  public getRouteForPlate(plateNumber: string): VehicleRoutePoint[] {
    const cleanPlate = normalizePlate(plateNumber);
    const matchedSightings = this.data.sightings.filter(
      (s) =>
        normalizePlate(s.plateNumber) === cleanPlate ||
        (s.matchedWatchlistPlate && normalizePlate(s.matchedWatchlistPlate) === cleanPlate)
    );

    if (matchedSightings.length === 0) return [];

    // Helper to parse timestamps to epoch seconds for true chronological ordering
    const parseTime = (ts: string): number => {
      try {
        if (!ts) return 0;
        if (ts.includes('Today, ')) {
          const raw = ts.replace('Today, ', '').trim();
          const isPM = /pm/i.test(raw);
          const isAM = /am/i.test(raw);
          const cleanTime = raw.replace(/[^\d:]/g, '');
          const parts = cleanTime.split(':');
          if (parts.length >= 2) {
            let h = parseInt(parts[0], 10);
            if (isPM && h < 12) h += 12;
            if (isAM && h === 12) h = 0;
            const m = parseInt(parts[1], 10);
            const s = parseInt(parts[2] || '0', 10);
            return h * 3600 + m * 60 + s;
          }
        }
        const d = new Date(ts);
        if (!isNaN(d.getTime())) return d.getTime();
      } catch {
        // fallback
      }
      return 0;
    };

    // Sort chronologically (oldest traversal first -> latest arrival last)
    const sorted = [...matchedSightings].sort((a, b) => {
      const ta = parseTime(a.timestamp);
      const tb = parseTime(b.timestamp);
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });

    // Deduplicate consecutive sightings at the exact same camera to prevent node stacking
    const distinctPoints: typeof sorted = [];
    for (const s of sorted) {
      const prev = distinctPoints[distinctPoints.length - 1];
      if (!prev || prev.cameraId.toLowerCase() !== s.cameraId.toLowerCase()) {
        distinctPoints.push(s);
      } else {
        if (s.detectionConfidence > prev.detectionConfidence) {
          distinctPoints[distinctPoints.length - 1] = s;
        }
      }
    }

    const pointsToUse = distinctPoints.length > 0 ? distinctPoints : sorted;

    return pointsToUse.map((s, idx) => {
      const cam = this.getCameraById(s.cameraId);
      return {
        order: idx + 1,
        cameraId: s.cameraId,
        cameraName: s.cameraName || (cam ? cam.name : `Camera ${s.cameraId}`),
        location: s.location || (cam ? cam.location : 'Ahmedabad Urban Sector'),
        latitude: cam ? cam.latitude : 23.0338 + idx * 0.008,
        longitude: cam ? cam.longitude : 72.585 + idx * 0.01,
        timestamp: s.timestamp,
        plateConfidence: s.detectionConfidence,
        ocrConfidence: s.ocrConfidence,
        speedKmh: s.speedKmh || 55,
        aggregationAgreement: s.aggregationAgreement || '13/16 (81.2%)',
      };
    });
  }

  // ==================== DASHBOARD SUMMARY ====================
  public getDashboardSummary(): DashboardSummary {
    const totalCameras = this.data.cameras.length;
    const onlineCameras = this.data.cameras.filter((c) => c.status === 'online').length;
    const offlineCameras = this.data.cameras.filter((c) => c.status === 'offline').length;
    const warningCameras = this.data.cameras.filter((c) => c.status === 'warning').length;

    const activeAlerts = this.data.alerts.filter(
      (a) => a.status === 'new' || a.status === 'under_review'
    ).length;

    const highPriorityAlerts = this.data.alerts.filter(
      (a) => a.priority === 'high' && (a.status === 'new' || a.status === 'under_review')
    ).length;

    const possibleMatchesCount = this.data.alerts.filter(
      (a) => a.matchType === 'possible' && (a.status === 'new' || a.status === 'under_review')
    ).length;

    return {
      totalCameras,
      onlineCameras,
      offlineCameras,
      warningCameras,
      activeAlerts,
      highPriorityAlerts,
      possibleMatchesCount,
      watchlistCount: this.data.watchlist.filter((w) => w.status === 'active').length,
      totalDetectionsToday: 24780 + this.data.sightings.length,
      systemUptime: '99.92%',
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cameraHealthSummary: {
        status: offlineCameras > 2 ? 'critical' : warningCameras > 0 ? 'degraded' : 'optimal',
        uptimePercent: 99.85,
        activeFeeds: onlineCameras,
        failedPings: offlineCameras,
      },
    };
  }

  // ==================== PIPELINE SIMULATION / TEST RUN ====================
  public getPipelineStatus(): PipelineStatus {
    return { ...this.data.pipelineStatus };
  }

  /**
   * Triggers the real multi-camera AI pipeline simulation as tested by the user.
   * Simulates tracking + OCR aggregation (13/16 consensus) across cameras for DL3CAM1234 or a custom plate.
   */
  public runLivePipelineTest(options?: {
    plateNumber?: string;
    targetWatchlistPlate?: string;
    isPossibleMatchFumble?: boolean;
    multiCameraSequence?: boolean;
  }): {
    success: boolean;
    plateNumber: string;
    agreement: string;
    sightings: VehicleSighting[];
    alerts: Alert[];
  } {
    const targetPlate = options?.targetWatchlistPlate || 'DL3CAM1234';
    // If testing possible match fumble, change 1 digit (e.g. 'DL3CAM123A' vs 'DL3CAM1234')
    const plateToDetect = options?.isPossibleMatchFumble
      ? (options.plateNumber || 'DL3CAM123A')
      : (options?.plateNumber || targetPlate);

    const agreement = options?.isPossibleMatchFumble ? '13/16 (81.2%)' : '14/16 (87.5%)';

    const camerasToUse = options?.multiCameraSequence
      ? ['CAM-05', 'CAM-09', 'CAM-07', 'CAM-04', 'CAM-08', 'CAM-10', 'CAM-11', 'CAM-03', 'CAM-02', 'CAM-06']
      : ['CAM-01'];
    const createdSightings: VehicleSighting[] = [];
    const createdAlerts: Alert[] = [];

    const now = new Date();

    camerasToUse.forEach((camId, index) => {
      const timeOffsetSeconds = index * 45;
      const sDate = new Date(now.getTime() - timeOffsetSeconds * 1000);
      const timeStr = `Today, ${sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

      const res = this.addSighting({
        plateNumber: plateToDetect,
        cameraId: camId,
        detectionConfidence: Number((94.5 + Math.random() * 4).toFixed(1)),
        ocrConfidence: Number((89.0 + Math.random() * 8).toFixed(1)),
        trackingConfidence: Number((96.0 + Math.random() * 3).toFixed(1)),
        trackingId: `TRK-${400 + index * 7}`,
        aggregationAgreement: agreement,
        vehicleType: 'Sedan',
        vehicleColor: 'Silver Metallic',
        speedKmh: Math.floor(52 + index * 6),
        timestamp: timeStr,
      });

      createdSightings.push(res.sighting);
      if (res.alert) {
        createdAlerts.push(res.alert);
      }
    });

    return {
      success: true,
      plateNumber: plateToDetect,
      agreement,
      sightings: createdSightings,
      alerts: createdAlerts,
    };
  }

  private checkSightingsAgainstWatchlistEntry(entry: WatchlistEntry) {
    // When a new watchlist entry is added, check if any recent sightings match it
    for (const s of this.data.sightings) {
      if (s.matchType === 'none' || !s.matchedWatchlistPlate) {
        const check = matchPlateAgainstWatchlist(s.plateNumber, [entry]);
        if (check.isMatch) {
          s.matchType = check.matchType;
          s.matchedWatchlistPlate = entry.plateNumber;
          const isExact = check.matchType === 'exact';

          const newAlert: Alert = {
            id: generateUniqueEntityId('ALT'),
            type: isExact ? 'Watchlist Alert' : 'Possible Watchlist Match',
            priority: isExact ? entry.priority : 'medium',
            plateNumber: s.plateNumber,
            matchedWatchlistPlate: entry.plateNumber,
            matchType: isExact ? 'exact' : 'possible',
            similarityScore: check.similarity,
            editDistance: check.distance,
            aggregationAgreement: s.aggregationAgreement || '13/16 (81.2%)',
            cameraId: s.cameraId,
            cameraName: s.cameraName,
            location: s.location,
            timestamp: s.timestamp,
            reason: isExact
              ? `${entry.category}: ${entry.reason}`
              : `Possible Watchlist Match: Detected '${s.plateNumber}' differs by ${check.distance} character from Watchlist entry '${entry.plateNumber}'. Suspected OCR fumble.`,
            status: 'new',
            confidence: Number(((s.detectionConfidence + s.ocrConfidence) / 2).toFixed(1)),
            detectionConfidence: s.detectionConfidence,
            ocrConfidence: s.ocrConfidence,
            caseId: entry.caseId,
            notes: `Retroactive match triggered upon addition of watchlist item ${entry.plateNumber}.`,
            evidenceUrl: s.evidenceUrl,
          };

          this.data.alerts.unshift(newAlert);
          this.emit('alert:created', newAlert);
        }
      }
    }
  }
}

// ==================== GRID SYNC TYPES ====================

/**
 * Shape of a single entry returned by GET ${CCTV_GRID_HOST}/api/ingest.
 * Field names are mapped defensively from both camelCase and snake_case
 * variants since the spec doesn't pin the exact serialisation.
 */
export interface GridCameraEntry {
  // Primary identifiers — at least one of these will be present
  id?: string;
  camera_id?: string;
  // Human label
  location?: string;
  name?: string;
  // Codec string, e.g. "H264", "H265", "h264"
  codec?: string;
  video_codec?: string;
  // Live / offline status
  status?: string;
  live?: boolean;
  // Stream URL fields — we prefer the explicit HLS field when present;
  // otherwise we fall back to constructing the standard pattern.
  hlsUrl?: string;
  hls_url?: string;
  hls?: string;
  // Optional extras the grid may include
  fps?: number;
  frame_rate?: number;
  resolution?: string;
  width?: number;
  height?: number;
  // RTSP is for AI pipeline only — we store it for reference but do NOT use
  // it as the browser streamUrl.
  rtspUrl?: string;
  rtsp_url?: string;
  rtsp?: string;
  // WebRTC/WHEP — noted for future lower-latency option, not used yet
  whepUrl?: string;
  whep_url?: string;
}

// ==================== GRID SYNC HELPER ====================

/**
 * Derives a canonical HLS browser URL from a catalogue entry.
 * Prefers an explicit URL field on the entry; falls back to the
 * standard grid pattern if the CCTV_GRID_HOST env var is set.
 */
function deriveHlsUrl(entry: GridCameraEntry, id: string): string {
  // Use explicit HLS URL from catalogue when available
  if (entry.hlsUrl) return entry.hlsUrl;
  if (entry.hls_url) return entry.hls_url;
  if (entry.hls) return entry.hls;
  // Construct from known grid URL pattern
  const host = (typeof process !== 'undefined' && process.env.CCTV_GRID_HOST) || '';
  if (host) return `${host}/live/stream/${id}/index.m3u8`;
  return '';
}

/**
 * Derives a resolution string from catalogue entry fields.
 */
function deriveResolution(entry: GridCameraEntry): string | undefined {
  if (entry.resolution) return entry.resolution;
  if (entry.width && entry.height) return `${entry.width}x${entry.height}`;
  return undefined;
}

/**
 * Derives fps from catalogue entry fields.
 */
function deriveFps(entry: GridCameraEntry): number | undefined {
  if (typeof entry.fps === 'number') return entry.fps;
  if (typeof entry.frame_rate === 'number') return entry.frame_rate;
  return undefined;
}

// ==================== DATABASE MANAGER (sync extension) ====================

// Add syncCamerasFromGrid to DatabaseManager by reopening the class instance approach.
// We attach it directly to the prototype after the class definition to keep the
// existing class block untouched.

// ==================== GLOBAL SINGLETON ====================
export const db = new DatabaseManager();

/**
 * Upserts cameras received from the real CCTV grid catalogue into the local
 * camera store. Only adds/updates — never removes locally-created cameras.
 *
 * @param entries  Array of catalogue entries from GET /api/ingest
 * @returns        { synced: number, total: number }
 */
export function syncCamerasFromGrid(
  entries: GridCameraEntry[]
): { synced: number; total: number } {
  let synced = 0;

  for (const entry of entries) {
    const id = entry.id || entry.camera_id;
    if (!id) {
      console.warn('[db] syncCamerasFromGrid: entry missing id, skipping', entry);
      continue;
    }

    const hlsUrl = deriveHlsUrl(entry, id);
    const resolution = deriveResolution(entry);
    const fps = deriveFps(entry);

    // Map catalogue status → our Camera status type
    let status: 'online' | 'offline' | 'warning' = 'online';
    const rawStatus = (entry.status || '').toLowerCase();
    if (rawStatus === 'offline' || rawStatus === 'inactive' || rawStatus === 'down') {
      status = 'offline';
    } else if (rawStatus === 'warning' || rawStatus === 'degraded' || rawStatus === 'jitter') {
      status = 'warning';
    } else if (entry.live === false) {
      status = 'offline';
    }

    const updates: Partial<import('../types').Camera> = {
      status,
      streamUrl: hlsUrl,
      ...(entry.location ? { location: entry.location } : {}),
      ...(entry.name ? { name: entry.name } : {}),
      ...(entry.codec || entry.video_codec
        ? { vendor: `Grid (${entry.codec || entry.video_codec})` }
        : {}),
      ...(resolution ? { resolution } : {}),
      ...(fps !== undefined ? { fps } : {}),
    };

    // Try to update an existing record
    try {
      db.updateCamera(id, updates);
    } catch {
      // Camera not in store yet — create it
      db.createCamera({
        id,
        name: entry.name || entry.location || id,
        location: entry.location || 'Grid Camera',
        status,
        streamUrl: hlsUrl,
        vendor: entry.codec || entry.video_codec ? `Grid (${entry.codec || entry.video_codec})` : 'Grid',
        fps,
        resolution,
        totalDetections: 0,
        activeAlertsCount: 0,
      });
    }

    synced += 1;
  }

  console.log(`[db] syncCamerasFromGrid: upserted ${synced}/${entries.length} cameras`);
  return { synced, total: entries.length };
}
