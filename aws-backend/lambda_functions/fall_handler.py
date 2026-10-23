"""
Fall Handler Lambda — Main Fall Detection Orchestrator
======================================================
Receives sensor data from Bee wearable via IoT Core, runs fall
classification, and publishes events to SQS for downstream processing.

AWS Services Used:
  - IoT Core: Ingests sensor data from Bee wearable
  - SQS: Decouples detection from alert routing (nexus-emergency-queue)
  - DynamoDB: Stores fall events and vitals history
  - CloudWatch Logs: Audit and monitoring
"""

import json
import os
import math
import boto3
from datetime import datetime
from typing import Optional

# AWS clients
sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION", "us-east-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-east-1"))
sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "us-east-1"))

# Configuration from environment
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL", "")
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "nexus-vitals")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN", "")
FALL_CONFIDENCE_THRESHOLD = float(os.environ.get("FALL_CONFIDENCE_THRESHOLD", "0.70"))

# Fall detection thresholds (tuned for elderly gait patterns)
class FallThresholds:
    IMPACT_THRESHOLD = 8.0       # g — hard impact indicates ground strike
    FLATLINE_THRESHOLD = 0.5     # g — near-zero after impact = on floor
    TUMBLE_THRESHOLD = 300.0     # deg/s — rapid rotation during fall
    BASELINE_MAGNITUDE_RANGE = (0.5, 2.5)  # Normal standing gravity vector


thresholds = FallThresholds()


def classify_fall(accel_data: list, gyro_data: list) -> dict:
    """
    ML-based fall classification using sensor fusion.

    Pipeline:
    1. Impact detection — accelerometer magnitude spike > 8g
    2. Post-impact flatline — magnitude drops to < 0.5g
    3. Tumble detection — gyroscope angular velocity > 300°/s
    4. Temporal validation — proper sequence: impact → flatline

    Returns classification with confidence score.
    """
    if len(accel_data) < 10:
        return {"classification": "insufficient_data", "confidence": 0.0}

    # Calculate magnitude for each reading
    magnitudes = [math.sqrt(sum(d**2 for d in acc)) for acc in accel_data]
    gyro_magnitudes = [math.sqrt(sum(d**2 for d in gyro)) for gyro in gyro_data]

    # Stage 1: Impact detection
    max_mag = max(magnitudes)
    impact_idx = magnitudes.index(max_mag)
    has_impact = max_mag >= thresholds.IMPACT_THRESHOLD

    # Stage 2: Post-impact flatline
    post_impact = magnitudes[impact_idx:]
    flatline_count = sum(1 for m in post_impact if m < thresholds.FLATLINE_THRESHOLD)
    flatline_ratio = flatline_count / len(post_impact) if post_impact else 0
    has_flatline = flatline_ratio > 0.5 and len(post_impact) > 5

    # Stage 3: Tumble detection
    max_gyro = max(gyro_magnitudes)
    has_tumble = max_gyro >= thresholds.TUMBLE_THRESHOLD

    # Stage 4: Pre-impact variance (sudden movement before impact)
    pre_impact = magnitudes[:impact_idx] if impact_idx > 0 else magnitudes
    pre_mean = sum(pre_impact) / len(pre_impact) if pre_impact else 1.0
    pre_variance = sum((m - pre_mean)**2 for m in pre_impact) / len(pre_impact) if pre_impact else 0
    has_pre_shift = pre_variance > 0.5

    # Weighted scoring
    scores = {
        "impact": 0.35 if has_impact else 0.0,
        "flatline": 0.25 if has_flatline else 0.0,
        "tumble": 0.25 if has_tumble else 0.0,
        "pre_shift": 0.15 if has_pre_shift else 0.0,
    }
    total_score = sum(scores.values())
    confidence = min(total_score, 1.0)

    # Classify
    if total_score >= FALL_CONFIDENCE_THRESHOLD:
        classification = "fall"
    elif total_score >= 0.45:
        classification = "possible_fall"
    else:
        classification = "normal_activity"

    return {
        "classification": classification,
        "confidence": round(confidence, 4),
        "scores": {k: round(v, 4) for k, v in scores.items()},
        "max_acceleration_g": round(max_mag, 4),
        "max_gyro_dps": round(max_gyro, 4),
        "flatline_ratio": round(flatline_ratio, 4),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


def store_vitals(user_id: str, device_id: str, accel: dict, gyro: dict, classification: str):
    """Store vitals and classification in DynamoDB for historical tracking."""
    table = dynamodb.Table(DYNAMODB_TABLE)
    item = {
        "user_id": user_id,
        "device_id": device_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "accelerometer": accel,
        "gyroscope": gyro,
        "classification": classification,
        "magnitude": round(math.sqrt(sum(v**2 for v in accel.values())), 4),
    }
    table.put_item(Item=item)


def send_to_sqs(event_data: dict):
    """Publish fall event to SQS for decoupled alert processing."""
    if not SQS_QUEUE_URL:
        print("[WARN] SQS_QUEUE_URL not configured, skipping SQS publish")
        return

    message = {
        "Records": [{
            "eventType": "AWS IoT Rule",
            "mqttTopic": event_data.get("topic", "nexus/sensors"),
            "payload": event_data,
        }]
    }

    response = sqs.send_message(
        QueueUrl=SQS_QUEUE_URL,
        MessageBody=json.dumps(message),
        MessageGroupId="nexus-falls",  # FIFO queue for ordering
        MessageDeduplicationId=f"fall-{datetime.utcnow().timestamp()}"
    )
    print(f"[SQS] Message sent: {response['MessageId']}")
    return response


def lambda_handler(event, context):
    """
    Main Lambda handler for fall detection.

    Event comes from IoT Core rule that forwards sensor data.
    Format: {"device_id": "...", "user_id": "...", "timestamp": "...", "accelerometer": {...}, "gyroscope": {...}}
    """
    print(f"[FallHandler] Processing event: {json.dumps(event)[:200]}")

    # Extract sensor data from IoT event
    record = event.get("Records", [{}])[0] if event.get("Records") else event
    payload = record.get("payload", {}) if "payload" in record else record

    device_id = payload.get("device_id", "unknown")
    user_id = payload.get("user_id", "unknown")
    accel = payload.get("accelerometer", {})
    gyro = payload.get("gyroscope", {})
    timestamp = payload.get("timestamp", datetime.utcnow().isoformat())

    # Convert to arrays for classification
    accel_data = [[accel.get("x_g", 0), accel.get("y_g", 0), accel.get("z_g", 0)]]
    gyro_data = [[gyro.get("x_dps", 0), gyro.get("y_dps", 0), gyro.get("z_dps", 0)]]

    # Classify
    result = classify_fall(accel_data, gyro_data)
    classification = result["classification"]

    print(f"[FallHandler] {user_id} — {classification} (confidence: {result['confidence']:.1%})")

    # Store in DynamoDB
    store_vitals(user_id, device_id, accel, gyro, classification)

    # Route to SQS if fall detected or possible
    if classification in ("fall", "possible_fall"):
        alert_event = {
            "event_type": "fall_detection",
            "user_id": user_id,
            "device_id": device_id,
            "classification": classification,
            "confidence": result["confidence"],
            "scores": result["scores"],
            "max_acceleration_g": result["max_acceleration_g"],
            "max_gyro_dps": result["max_gyro_dps"],
            "timestamp": result["timestamp"],
            "sensor_window": {
                "accelerometer": accel_data[0],
                "gyroscope": gyro_data[0],
            }
        }

        # Send to SQS for decoupled alert processing
        send_to_sqs({"topic": "nexus/falls", "payload": alert_event})

        # Also publish directly to SNS for immediate critical alerts
        if classification == "fall" and SNS_TOPIC_ARN:
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"🚨 FALL DETECTED — {user_id}",
                Message=json.dumps({
                    "type": "fall_alert",
                    "user_id": user_id,
                    "severity": "critical",
                    "confidence": result["confidence"],
                    "timestamp": result["timestamp"],
                    "max_acceleration_g": result["max_acceleration_g"],
                })
            )
            print(f"[SNS] Critical alert published for {user_id}")

    return {
        "statusCode": 200,
        "body": json.dumps({
            "user_id": user_id,
            "classification": classification,
            "confidence": result["confidence"],
            "action_taken": "alert_sent" if classification in ("fall", "possible_fall") else "logged"
        })
    }


if __name__ == "__main__":
    # Local testing
    print("=" * 60)
    print("  NEXUS — Fall Handler Lambda (Local Test)")
    print("=" * 60)

    test_event = {
        "Records": [{
            "mqttTopic": "nexus/sensors",
            "payload": {
                "device_id": "bee-ruth-001",
                "user_id": "ruth-martinez",
                "timestamp": "2026-10-20T14:30:00Z",
                "accelerometer": {"x_g": 2.1, "y_g": -0.3, "z_g": 8.7},
                "gyroscope": {"x_dps": -450, "y_dps": 320, "z_dps": -280},
                "battery_percent": 87
            }
        }]
    }

    result = lambda_handler(test_event, None)
    print(f"\nResult: {json.dumps(result, indent=2)}")
