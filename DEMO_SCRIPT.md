# NEXUS — Demo Script (3 Minutes)

## Minute 0:00–0:15 — Setup

> "Meet Ruth. She's 78, lives alone in her home of 40 years, and her son Mark checks in on her from 200 miles away every single day. Every night Mark worries: *What if she falls and I'm not there? What if she needs help and no one hears her?* That worry is what built Nexus."

**Show:** The caregiver dashboard loading. Show Ruth's profile card with her photo, age, address, and current status: "All Well — Last check-in: 2 minutes ago."

---

## Minute 0:15–0:45 — Normal Day

> "During a normal day, Nexus runs quietly in the background. Ruth wakes up, clips her Bee wearable to her blouse — it tracks her vitals and movement patterns. By 8 AM, the system has already verified she took her morning medication using our Rekognition-powered pill bottle detection."

**Show:**
- Fire TV ambient display cycling through: family photos → weather widget → today's medication schedule showing "✓ Aspirin taken at 8:02 AM"
- Dashboard updating: medication compliance ticker showing "98% this week"
- Vital signs panel showing stable heart rate (72 bpm), blood pressure (128/82), SpO2 (98%)

> "The Fire TV acts as a gentle ambient display — family photos, the day's plan, vitals at a glance. Nothing alarming, just comfort."

---

## Minute 0:45–1:15 — The Incident

> "Then it happens. Ruth is walking to the kitchen and slips on a rug edge. Her Bee wearable — the small device on her blouse — immediately detects the change in her movement pattern."

**Show:**
- Bee simulator terminal output scrolling through sensor data
- Accelerometer spike: `X: 2.1g → 8.7g → 0.3g` (the fall impact)
- Gyroscope tumble pattern: rapid rotation across all three axes
- Fall detector classification: **"FALL CONFIRMED — Confidence: 94.7%"**
- Dashboard flash: status changes from "All Well" → 🔴 **"EMERGENCY — Fall Detected"**

> "Our fall detection algorithm fuses accelerometer and gyroscope data. It's not just about a hard impact — it's about the *pattern*: the sudden acceleration, the loss of posture, the tumble. Normal movements like sitting down or reaching for something look completely different to the algorithm."

---

## Minute 1:15–1:45 — The Response

> "Within 2 seconds of detection, Nexus springs into action across every device in Ruth's home and Mark's phone."

**Show:**
- **Alexa device** in Ruth's kitchen: Screen shows "🚨 Checking on Ruth..." then voice: *"Ruth, I detect you may have fallen. Are you okay? Please respond."*
- **Fire TV**: Immediate switch from ambient mode to emergency overlay — large text: "EMERGENCY — Help is being dispatched", Mark's photo and name, "Call Mark: (555) 123-4567"
- **Mark's phone**: Push notification arrives: *"🚨 FALL DETECTED — Ruth slipped in her kitchen. Tap to view live camera feed."*
- **Dashboard**: Real-time alert appearing with timestamp, location in home (Kitchen), confidence score, and Ring camera snapshot

> "Alexa+ uses Bedrock to have a patient, calming conversation with Ruth. If she can respond, Mark gets notified immediately. If not, the system escalates."

---

## Minute 1:45–2:15 — Resolution

> "Mark sees the alert, opens the Ring camera feed, and sees Ruth sitting on the kitchen floor — conscious but unable to get up. He speaks to her through the Alexa device: 'Mom, I'm calling for help, can you hear me?'"

**Show:**
- Mark's dashboard showing the live Ring camera snapshot
- Conversation log: Mark's voice message transcribed
- Status update: "Help Dispatched — ETA 8 minutes"
- Dashboard timer showing: "Response time: 47 seconds from fall to Mark's confirmation"

> "Through Nexus, Mark isn't just getting an alert — he can see, speak, and coordinate in real-time. And when the paramedics arrive, the system automatically shares Ruth's medical profile and recent vitals."

---

## Minute 2:15–2:45 — Dashboard Walkthrough

> "After the incident settles, Mark pulls up the full Nexus dashboard to review everything."

**Show:**
- **Vital Signs Chart**: Scroll through the past 24 hours, showing the fall event as a spike in the accelerometer data
- **Alert History Timeline**: Chronological list of all events — medication reminders, the fall, Mark's response, help dispatched
- **Medication Compliance**: Weekly chart showing 98% adherence, with the one missed dose highlighted
- **Location Map**: Home floor plan showing Ruth's movement patterns and the exact location of the fall

> "Every interaction is logged. Every vital sign is tracked. Every medication dose is verified. Mark has complete visibility into Ruth's wellbeing — from anywhere."

---

## Minute 2:45–3:00 — Closing

> "Nexus isn't just technology — it's peace of mind. 12 million Americans fall every year. Half of them are elderly adults living alone. With Nexus, no one has to face a fall alone. Thank you."

**Show:**
- Final dashboard state: "Status: Stable — Mark confirmed · Help arrived at 2:23 PM · Next check-in: 3:00 PM"
- Nexus logo with tagline: *"Always watching. Always caring."*
