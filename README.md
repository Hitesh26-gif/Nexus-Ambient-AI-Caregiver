# NEXUS — Ambient AI Caregiver for Elderly Independence

> Built for the **Amazon Build Ship Shape Hackathon** — combining Bee wearable, Alexa+, Fire TV, and Ring into one cohesive eldercare ecosystem.

## The Problem

12 million Americans over 65 fall each year — and roughly half are elderly adults living alone. When a fall happens, the difference between life and death is minutes. Current solutions are fragmented: a smartwatch here, an alert button there, nothing that connects the dots between detection, response, and ongoing care.

## The Solution

**Nexus** is an ambient AI caregiver system that wraps around an elderly person's life — detecting emergencies before they become tragedies, communicating naturally through voice, and giving family peace of mind through a beautiful real-time dashboard.

### How It Works

1. **Bee Wearable** — A small clip-on device worn by the elder continuously monitors accelerometer and gyroscope data. Nexus's ML-based fall detector analyzes sensor fusion patterns in real-time, distinguishing between normal movement and actual falls with high accuracy.

2. **Alexa+ Voice Interface** — When a fall is detected (or at any time), Nexus speaks to the elder through Alexa+ devices in the home. It asks simple, patient questions: "Ruth, are you okay?" If there's no response or a distress signal, the emergency cascade begins.

3. **Fire TV Ambient Display** — When not actively showing emergency alerts, the Fire TV displays a warm, calming dashboard: rotating family photos, today's weather, medication schedule, and vitals summary. During an emergency, it immediately surfaces the caregiver's face and contact info.

4. **Ring Doorbell Integration** — Emergency snapshots from Ring cameras are captured and sent alongside alerts, so the caregiver can see exactly what happened.

5. **Caregiver Dashboard** — A React web application gives the remote family member (in our demo, Ruth's son Mark) complete visibility: live vital signs, alert history, medication compliance tracking, and a location map.

6. **AWS-Powered Backend** — All orchestration runs on AWS: Lambda functions process events, SQS queues decouple detection from response, SNS multi-casts alerts, SES delivers daily care reports, Bedrock provides natural conversation, and Rekognition verifies medication adherence and identifies visitors.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXUS ECOSYSTEM                          │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │   BEE    │    │  ALEXA+  │    │  FIRE TV │    │   RING   │  │
│  │ Wearable │    │  Smart   │    │  Ambient │    │ Camera   │  │
│  │ Sensors  │    │  Speaker │    │ Display  │    │ Feed     │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AWS Backend (Lambda + Events)               │   │
│  │                                                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────────┐  │   │
│  │  │ Fall    │  │ Alert   │  │ Medication│  │  Bedrock   │  │   │
│  │  │ Handler │  │ Router  │  │ Tracker │  │  Conversations │ │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────────────┘  │   │
│  │       │            │            │                         │   │
│  │  ┌────┴────────────┴────────────┴──────────┐             │   │
│  │  │         SQS Queue (Decoupling)          │             │   │
│  │  └────────────────────┬────────────────────┘             │   │
│  │                       │                                  │   │
│  │  ┌────────────────────┼────────────────────┐             │   │
│  │  │              SNS Topic                     │             │   │
│  │  │        (Multi-Channel Alerts)              │             │   │
│  │  └───┬─────────┬─────────┬────────┬─────────┘             │   │
│  │      │         │         │         │                       │   │
│  │      ▼         ▼         ▼         ▼                       │   │
│  │   SMS      Email     Push    SES Daily Report              │   │
│  └────────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Caregiver Dashboard (React)                 │    │
│  │   Live Vitals · Alert History · Med Compliance · Map    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
nexus/
├── bee-simulator/              # Bee wearable sensor simulation & fall detection
├── alexa-skill/                # Alexa+ custom skill for voice interactions
├── fire-tv-app/                # Fire TV ambient display app
├── ring-integration/           # Ring doorbell camera integration
├── aws-backend/                # Lambda functions + event orchestration
├── caregiver-dashboard/        # React web app for family monitoring
├── lambda-functions/           # All deployed Lambda code
├── README.md                   # This file
├── DEMO_SCRIPT.md              # 3-minute demo walkthrough
├── architecture.md             # Detailed system design
└── package.json                # Root workspace config
```

## AWS Services Used

| Service | Purpose |
|---------|---------|
| **Lambda** | Event handlers for fall detection, alert routing, medication tracking |
| **SQS** | Decouple fall detection from alert routing; handle burst traffic |
| **SNS** | Multi-channel notifications (SMS via Pinpoint, email via SES, push) |
| **SES** | Daily/weekly care reports delivered to family members |
| **Bedrock** | Natural language understanding for elder-friendly voice interactions |
| **Rekognition** | Face verification for visitors; object detection for medication adherence |
| **IoT Core** | Connect Bee wearable sensors to the cloud |
| **Step Functions** | Orchestrate the emergency response workflow |
| **DynamoDB** | Store vitals, alerts, and medication logs |
| **S3** | Store emergency snapshots and care report assets |

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.10+
- AWS CLI configured
- An Amazon account for Alexa+ / Fire TV / Ring integration

### Install

```bash
npm install
```

### Run the Bee Simulator

```bash
python bee-simulator/simulator.py
```

This simulates normal activity, then triggers a fall event to demonstrate the full pipeline.

### Run the Dashboard

```bash
npm run dev:dashboard
```

Opens the caregiver dashboard at `http://localhost:5173`.

### Run the Alexa Skill (local testing)

```bash
cd alexa-skill && node index.js
```

## Demo

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for the full 3-minute demonstration walkthrough.

## License

MIT