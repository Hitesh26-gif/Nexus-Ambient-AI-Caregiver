/**
 * Nexus Fire TV App — Ambient Display
 *
 * Cycles through three display modes on the Fire TV:
 * 1. Family Feed — Rotating family photos with warm frames
 * 2. Ambient Dashboard — Health stats, weather, medication schedule
 * 3. Emergency Overlay — Full-screen alert during emergencies
 *
 * This is the companion app that runs on Fire TV devices.
 * In production, this would be a Java/Kotlin Android app packaged as a Fire TV skill.
 * Here we implement the full component logic in React for demonstration.
 */

// ─── State Management ─────────────────────────────────────────────────────────
// In production, this uses the Fire TV APL (Alexa Presentation Language) framework.
// For the demo, we render these as React components consumed by the main app.

export const DISPLAY_MODES = {
  FAMILY_FEED: "family_feed",
  AMBIENT_DASHBOARD: "ambient_dashboard",
  EMERGENCY_OVERLAY: "emergency_overlay",
};

export const CYCLE_INTERVAL_MS = 30000; // 30 seconds per mode

// ─── Family Feed Data ─────────────────────────────────────────────────────────
export const FAMILY_PHOTOS = [
  { id: 1, url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800", caption: "Family picnic, Summer 2024" },
  { id: 2, url: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=800", caption: "Ruth's 75th Birthday" },
  { id: 3, url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800", caption: "Mark's Wedding Day" },
  { id: 4, url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800", caption: "Thanksgiving with the Grandkids" },
];

// ─── Ambient Dashboard Data ───────────────────────────────────────────────────
export const AMBIENT_DATA = {
  weather: {
    location: "Austin, TX",
    temperature: 78,
    condition: "Partly Cloudy",
    high: 84,
    low: 65,
    icon: "⛅",
  },
  medications: [
    { name: "Aspirin 81mg", time: "8:00 AM", taken: true, takenAt: "8:02 AM" },
    { name: "Lisinopril 10mg", time: "12:00 PM", taken: false, takenAt: null },
    { name: "Metformin 500mg", time: "6:00 PM", taken: false, takenAt: null },
  ],
  vitals_summary: {
    heart_rate: 72,
    bp_systolic: 128,
    bp_diastolic: 82,
    spo2: 98,
    status: "stable",
  },
  next_check_in: "3:00 PM",
  caregiver: {
    name: "Mark Martinez",
    phone: "(555) 123-4567",
    distance: "200 miles",
    available: true,
  },
};

// ─── Emergency Overlay Data ───────────────────────────────────────────────────
export interface EmergencyState {
  active: boolean;
  type: "fall" | "medical" | "intrusion" | null;
  severity: "warning" | "critical" | null;
  timestamp: string;
  location: string;
  caregiver_contact: {
    name: string;
    phone: string;
    photo_url: string;
  };
  help_dispatched: boolean;
  help_eta_minutes: number;
  snapshot_url: string;
}

export const DEFAULT_EMERGENCY_STATE: EmergencyState = {
  active: false,
  type: null,
  severity: null,
  timestamp: "",
  location: "",
  caregiver_contact: {
    name: "Mark Martinez",
    phone: "(555) 123-4567",
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
  },
  help_dispatched: false,
  help_eta_minutes: 0,
  snapshot_url: "",
};

// ─── APL Document Templates ───────────────────────────────────────────────────
// These would be rendered as APL (Alexa Presentation Language) documents
// on actual Fire TV devices.

export const AMBIENT_APL_DOCUMENT = {
  type: "APL",
  version: "1.8",
  theme: "dark",
  imports: [{ name: "amazoncolors", uri: "aws-assets:amazoncolors.css" }],
  resources: [],
  styles: {
    ambientText: {
      fontFamily: "SourceSansPro-Regular",
      fontSize: "24px",
      color: "#FFFFFF",
      textAlign: "center",
    },
    card: {
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: "16px",
      padding: "20px",
    },
  },
  layouts: {
    familyPhoto: {
      ItemType: "Avatar",
      size: "full",
      scale: "cover",
      shape: "rounded",
    },
    statCard: {
      type: "Container",
      items: [{
        type: "Text",
        styles: { ambientText },
        items: [{ type: "Text", text: "{value}" }, { type: "Text", text: "{label}" }],
      }],
    },
  },
  mainTemplate: {
    parameters: ["payload"],
    items: [{
      type: "Vector",
      width: "100%",
      height: "100%",
      backgroundImage: {
        type: "Image",
        source: "{payload.photoUrl}",
        placement: "cover",
      },
      items: [{
        type: "Container",
        position: "absolute",
        bottom: "10%",
        width: "100%",
        items: [{
          type: "Text",
          text: "{payload.caption}",
          styles: { ambientText },
          textColor: "#FFFFFF",
          textAlign: "center",
          fontSize: "32px",
        }],
      }],
    }],
  },
};

export const EMERGENCY_APL_DOCUMENT = {
  type: "APL",
  version: "1.8",
  theme: "dark",
  imports: [{ name: "amazoncolors", uri: "aws-assets:amazoncolors.css" }],
  layouts: {},
  mainTemplate: {
    parameters: ["emergency"],
    items: [{
      type: "Container",
      items: [
        // Pulsing red border effect
        {
          type: "Rectangle",
          width: "100%",
          height: "100%",
          color: "#CC0000",
          alpha: 0.3,
        },
        // Emergency header
        {
          type: "Text",
          text: "EMERGENCY",
          fontSize: "72px",
          textColor: "#FF0000",
          bold: true,
          alignContent: "center",
          width: "100%",
        },
        // Caregiver photo and contact
        {
          type: "Container",
          items: [
            {
              type: "Avatar",
              source: "{emergency.caregiver_contact.photo_url}",
              size: "large",
              shape: "circle",
            },
            {
              type: "Text",
              text: "{emergency.caregiver_contact.name}",
              fontSize: "40px",
              textColor: "#FFFFFF",
              alignContent: "center",
            },
            {
              type: "Text",
              text: "📞 {emergency.caregiver_contact.phone}",
              fontSize: "36px",
              textColor: "#FFD700",
              alignContent: "center",
            },
          ],
        },
        // Snapshot
        {
          type: "Image",
          source: "{emergency.snapshot_url}",
          width: "80%",
          height: "400px",
          placement: "center",
        },
        // Status
        {
          type: "Text",
          text: "{emergency.help_dispatched ? 'HELP DISPATCHED · ETA ' + emergency.help_eta_minutes + ' min' : 'RESPONDING...'}",
          fontSize: "32px",
          textColor: emergency.help_dispatched ? "#00FF00" : "#FFD700",
          alignContent: "center",
          width: "100%",
        },
      ],
    }],
  },
};

// ─── Cycle Logic ──────────────────────────────────────────────────────────────
/**
 * Determine which display mode should be active.
 * Emergency always takes priority.
 */
export function getActiveMode(emergency: EmergencyState, timeSinceLastSwitch: number): string {
  if (emergency.active) return DISPLAY_MODES.EMERGENCY_OVERLAY;
  const cycleIndex = Math.floor(timeSinceLastSwitch / CYCLE_INTERVAL_MS) % 2;
  return cycleIndex === 0 ? DISPLAY_MODES.FAMILY_FEED : DISPLAY_MODES.AMBIENT_DASHBOARD;
}

/**
 * Get the next photo in the rotation (with metadata for APL rendering).
 */
export function getNextPhoto(index: number) {
  return FAMILY_PHOTOS[index % FAMILY_PHOTOS.length];
}
