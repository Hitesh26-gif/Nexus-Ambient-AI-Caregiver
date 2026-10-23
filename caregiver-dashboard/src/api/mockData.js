/**
 * Nexus API Layer — Mock data service simulating AWS backend
 * In production, replace with real API calls to Lambda/SQS/SNS endpoints
 */

const MOCK_USER = {
  id: "ruth-martinez",
  name: "Ruth Martinez",
  age: 78,
  photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
  address: "123 Oak Street, Austin, TX 78701",
  phone: "(555) 987-6543",
  emergencyContact: {
    name: "Mark Martinez",
    phone: "(555) 123-4567",
    relationship: "Son",
    email: "mark.martinez@email.com",
  },
  conditions: ["Hypertension", "Type 2 Diabetes"],
  medications: [
    { name: "Aspirin 81mg", time: "08:00", frequency: "Daily" },
    { name: "Lisinopril 10mg", time: "12:00", frequency: "Daily" },
    { name: "Metformin 500mg", time: "18:00", frequency: "Daily" },
  ],
  enrolledSince: "2024-01-15",
  beeDeviceId: "bee-ruth-001",
  status: "stable",
};

// Generate realistic vital signs data for the past 24 hours
function generateVitalsData(hours = 24) {
  const data = [];
  const now = new Date();
  for (let i = hours * 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000);
    const hour = time.getHours();
    const isSleeping = hour >= 22 || hour < 6;
    const isActivity = hour >= 8 && hour <= 20;

    data.push({
      time: time.toISOString(),
      timeLabel: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      heartRate: isSleeping
        ? Math.round(60 + Math.random() * 10)
        : isActivity
        ? Math.round(70 + Math.random() * 30)
        : Math.round(68 + Math.random() * 15),
      bloodPressureSystolic: Math.round(120 + Math.random() * 20),
      bloodPressureDiastolic: Math.round(75 + Math.random() * 15),
      spo2: Math.round(95 + Math.random() * 4),
      temperature: +(97.5 + Math.random() * 1.5).toFixed(1),
      magnitude: +(0.3 + Math.random() * 0.5).toFixed(3),
    });
  }
  return data;
}

// Generate fall events for the timeline
function generateFallEvents() {
  return [
    {
      id: "evt-20241020-001",
      type: "fall",
      severity: "critical",
      timestamp: "2026-10-20T14:32:00Z",
      location: "Kitchen",
      confidence: 0.947,
      maxAcceleration: 12.4,
      description: "Fall detected via Bee wearable sensor fusion",
      response: {
        alexaNotified: true,
        alexaResponseTime: "2.1s",
        snapshotCaptured: true,
        alertsSent: ["SMS", "Email", "Push", "Fire TV"],
        caregiverNotified: true,
        caregiverResponseTime: "47s",
        helpDispatched: true,
        helpETA: "8 min",
      },
      handled: true,
    },
    {
      id: "evt-20241019-001",
      type: "possible_fall",
      severity: "warning",
      timestamp: "2026-10-19T10:15:00Z",
      location: "Living Room",
      confidence: 0.52,
      maxAcceleration: 6.1,
      description: "Possible fall — classified as normal activity after recheck",
      response: {
        alexaNotified: true,
        alexaResponseTime: "1.8s",
        snapshotCaptured: false,
        alertsSent: [],
        caregiverNotified: false,
        falsePositive: true,
      },
      handled: true,
    },
    {
      id: "evt-20241018-001",
      type: "medication_missed",
      severity: "warning",
      timestamp: "2026-10-18T12:05:00Z",
      location: null,
      confidence: null,
      maxAcceleration: null,
      description: "Lisinopril 10mg dose missed — reminder sent via Alexa",
      response: {
        reminderSent: true,
        reminderChannel: "Alexa Voice",
        eventuallyTaken: true,
        takenAt: "12:45 PM",
      },
      handled: true,
    },
  ];
}

// Generate alert history
function generateAlertHistory(days = 7) {
  const alerts = [];
  const now = new Date();
  for (let i = 0; i < days * 4; i++) {
    const time = new Date(now.getTime() - i * 6 * 60 * 60 * 1000);
    alerts.push({
      id: `alert-${i}`,
      type: i % 5 === 0 ? "fall" : i % 3 === 0 ? "medication" : "system",
      severity: i % 5 === 0 ? "critical" : "info",
      message: i % 5 === 0
        ? "Normal movement detected — no fall"
        : i % 3 === 0
        ? "Medication reminder sent"
        : "Vitals check completed",
      timestamp: time.toISOString(),
      read: i > 3,
    });
  }
  return alerts;
}

// Medication log for the week
function generateMedicationLog() {
  const meds = [
    { name: "Aspirin 81mg", icon: "💊", color: "#6366f1" },
    { name: "Lisinopril 10mg", icon: "💊", color: "#10b981" },
    { name: "Metformin 500mg", icon: "💊", color: "#f59e0b" },
  ];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay();
  const dayOffset = today === 0 ? 6 : today - 1;

  return days.map((day, dayIdx) => ({
    day,
    date: dayIdx <= dayOffset ? day : null,
    doses: meds.map((med, medIdx) => {
      const taken = dayIdx < dayOffset || (dayIdx === dayOffset && Math.random() > 0.1);
      return {
        medication: med.name,
        icon: med.icon,
        color: med.color,
        taken,
        time: ["08:00", "12:00", "18:00"][medIdx],
        verifiedAt: taken ? `${["8:02", "12:05", "18:01"][medIdx]} AM/PM` : null,
      };
    }),
  }));
}

// Location/map data
const HOME_FLOOR_PLAN = {
  rooms: [
    { id: "living", name: "Living Room", x: 0, y: 0, w: 40, h: 35 },
    { id: "kitchen", name: "Kitchen", x: 40, y: 0, w: 30, h: 35 },
    { id: "bedroom", name: "Bedroom", x: 0, y: 35, w: 35, h: 30 },
    { id: "bathroom", name: "Bathroom", x: 35, y: 35, w: 25, h: 30 },
    { id: "hallway", name: "Hallway", x: 60, y: 35, w: 40, h: 30 },
  ],
  lastKnownPosition: { x: 55, y: 15, room: "kitchen", timestamp: "2026-10-20T14:32:00Z" },
  fallLocation: { x: 52, y: 18, room: "kitchen" },
  motionTrail: [
    { x: 10, y: 10, t: "14:25" },
    { x: 20, y: 12, t: "14:26" },
    { x: 35, y: 15, t: "14:27" },
    { x: 50, y: 18, t: "14:30" },
    { x: 52, y: 18, t: "14:32" }, // Fall location
  ],
};

// Camera snapshots
const CAMERA_SNAPSHOTS = {
  frontDoor: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
  kitchen: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400",
  livingRoom: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400",
};

// Fake care reports
const CARE_REPORTS = [
  {
    id: "report-20241020",
    date: "2026-10-20",
    type: "daily",
    compliance: 98,
    falls: 1,
    avgHeartRate: 74,
    avgBPSystolic: 128,
    avgBPDiastolic: 82,
    avgSpO2: 98,
    recommendations: [
      "All vitals within normal range. Continue current care plan.",
      "Review kitchen rug — potential tripping hazard identified.",
    ],
  },
  {
    id: "report-20241019",
    date: "2026-10-19",
    type: "daily",
    compliance: 100,
    falls: 0,
    avgHeartRate: 71,
    avgBPSystolic: 125,
    avgBPDiastolic: 80,
    avgSpO2: 99,
    recommendations: ["Excellent day. All medications taken on schedule."],
  },
];

export {
  MOCK_USER,
  generateVitalsData,
  generateFallEvents,
  generateAlertHistory,
  generateMedicationLog,
  HOME_FLOOR_PLAN,
  CAMERA_SNAPSHOTS,
  CARE_REPORTS,
};
