# NEXUS Architecture

## System Overview

Nexus is a multi-device, event-driven eldercare system built on AWS. It integrates four touchpoints — a wearable device (Bee), voice assistant (Alexa+), ambient display (Fire TV), and smart camera (Ring) — into a unified care orchestration engine.

## Data Flow

### Normal Operation
```
Bee Wearable → IoT Core → Lambda (sensor processor) → DynamoDB (vitals store)
                                                            ↓
                                                    SNS (health summary) → SES (daily report)
                                                            ↓
                                                    Fire TV (ambient display update)
```

### Emergency Detection
```
Bee Wearable → IoT Core → Lambda (fall detector) → SQS (event queue)
                                                      ↓
                                              Lambda (alert router)
                                                      ↓
                                    ┌─────────────────┼─────────────────┐
                                    ↓                 ↓                 ↓
                              Alexa+ (voice)    SNS (multi-channel)   Fire TV (overlay)
                                    ↓                 ↓
                              Bedrock (LLM)    SMS / Email / Push
                                    ↓
                              Ring Camera → S3 (snapshot storage)
                                    ↓
                              Rekognition (face verification)
```

## Component Details

### Bee Simulator (`bee-simulator/`)
Simulates the Bee wearable's sensor output. Generates realistic accelerometer (3-axis, ±16g) and gyroscope (3-axis, ±2000°/s) data streams. Includes a lightweight fall detection algorithm using threshold-based classification with hysteresis.

**Key signals:**
- Resting: ~1.0g on Z-axis (gravity), near-zero on X/Y
- Walking: periodic 0.5–2.0g oscillation on all axes
- Falling: sharp spike (>8g) followed by flatline (<0.5g for 3+ seconds)

### Alexa Skill (`alexa-skill/`)
Custom interaction model for eldercare. Uses Bedrock to generate patient, simple-language responses appropriate for elderly users. Handles:
- Status checks ("Am I okay?", "How am I doing?")
- Emergency calls ("Call my son")
- Medication reminders
- Casual conversation (reduced cognitive load patterns)

### Fire TV App (`fire-tv-app/`)
Ambient display that cycles through three modes:
1. **Family Feed** — Rotating photos from S3, framed with warm borders
2. **Health Stats** — Today's vitals, medication schedule, weather
3. **Emergency Overlay** — Full-screen alert with caregiver contact, camera snapshot, status

### Ring Integration (`ring-integration/`)
Captures snapshots from Ring doorbell cameras during emergencies. Uses Rekognition to verify faces (distinguishing Ruth from visitors) and detect objects (pill bottles, mobility aids). Snapshots stored in S3 with metadata for the caregiver dashboard.

### AWS Backend (`aws-backend/`)

**Lambda Functions:**
- `fall_handler.py` — Receives IoT sensor data, runs fall classification, publishes to SQS
- `alert_router.py` — Consumes from SQS, routes through SNS to all channels
- `medication_tracker.py` — Processes Rekognition results for pill bottle detection
- `care_reporter.py` — Generates daily/weekly summaries via SES
- `context_understanding.py` — Bedrock-powered conversation analysis

**SQS Queue:** `nexus-emergency-queue` — Decouples fall detection from alert routing. Handles bursts (multiple sensors firing simultaneously) without dropping messages. FIFO enabled for ordering guarantees.

**Step Functions:** `emergency_workflow.asl.json` — Orchestrates the full response sequence:
1. Receive fall event
2. Wait 3s for user recovery (handles false positives)
3. Trigger Alexa+ voice check
4. If no response → capture Ring snapshots
5. Send multi-channel alerts via SNS
6. Log to DynamoDB
7. Update Fire TV display

### Caregiver Dashboard (`caregiver-dashboard/`)
React SPA with real-time updates via WebSocket simulation. Four main panels:
- **Live Feed** — Current vitals, latest Ring snapshot
- **Vital Monitor** — 24h scrollable charts (heart rate, BP, SpO2, accelerometer)
- **Alert History** — Timeline of all events with severity coloring
- **Medication Log** — Compliance tracking with weekly aggregation

## AWS Service Mapping

| Service | Role | Integration Point |
|---------|------|-------------------|
| Lambda | Event processing | All handler functions |
| IoT Core | Device gateway | Bee wearable → fall_handler |
| SQS | Event buffering | Between fall_handler and alert_router |
| SNS | Fan-out | alert_router → SMS/Email/Push |
| SES | Email delivery | care_reporter → family emails |
| Bedrock | NLP | context_understanding → Alexa responses |
| Rekognition | Vision | Ring snapshots → face/object detection |
| DynamoDB | Persistence | All Lambda functions → vitals/alerts/logs |
| S3 | Storage | Ring snapshots, care reports, family photos |
| Step Functions | Orchestration | Full emergency workflow |

## Security

- All Lambda functions use IAM roles with minimum required permissions
- IoT Core devices authenticated via X.509 certificates
- S3 buckets encrypted with SSE-KMS
- SNS topics restricted by policy to authorized Lambdas only
- Dashboard uses JWT authentication (simulated in demo)
- PII encrypted at rest in DynamoDB (GSI for query patterns)
