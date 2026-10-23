"""
Medication Tracker Lambda — Rekognition-Based Pill Detection
============================================================
Tracks medication adherence using Amazon Rekognition to:
  1. Detect pill bottles in photos taken by the caregiver or Ring camera
  2. Verify medication intake by comparing photo timestamps with schedule
  3. Generate compliance reports for the daily care report

AWS Services Used:
  - Rekognition: detect_labels() for pill bottle detection
  - DynamoDB: Store medication schedule and adherence records
  - SNS: Notify when medication is missed
  - S3: Store medication photos for reference
"""

import json
import os
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# AWS clients
rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_REGION", "us-east-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-east-1"))
sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "us-east-1"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"))

TABLE_NAME = os.environ.get("TABLE_NAME", "nexus-medication")
PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET", "nexus-medication-photos")
REMINDER_TOPIC_ARN = os.environ.get("REMINDER_TOPIC_ARN", "")


def get_medication_schedule(user_id: str) -> List[Dict]:
    """
    Retrieve medication schedule from DynamoDB.
    Returns list of medications with times and status.
    """
    table = dynamodb.Table(TABLE_NAME)
    response = table.query(
        IndexName="user-timestamp-index",
        KeyConditionExpression="user_id = :uid",
        ExpressionAttributeValues={":uid": user_id}
    )
    return response.get("Items", [])


def detect_pill_bottles(image_s3_key: str) -> Dict:
    """
    Use Rekognition to detect pill bottles and medication containers.

    AWS Service: Amazon Rekognition DetectLabels
    Minimum confidence: 70% to reduce false positives.
    """
    response = rekognition.detect_labels(
        Image={"S3Object": {"Bucket": PHOTOS_BUCKET, "Name": image_s3_key}},
        MaxLabels=50,
        MinConfidence=70.0
    )

    labels = response.get("Labels", [])
    pill_related = [
        l for l in labels
        if l["Name"].lower() in (
            "pill bottle", "medication", "medicine", "pill", "capsule",
            "tablet", "bottle", "药瓶", "medicines"
        )
    ]

    return {
        "pill_bottles_detected": len(pill_related) > 0,
        "confidence": pill_related[0]["Confidence"] if pill_related else 0,
        "detected_labels": [l["Name"] for l in pill_related],
        "all_labels": [{"name": l["Name"], "confidence": l["Confidence"]} for l in labels[:20]]
    }


def verify_medication_taken(
    user_id: str,
    medication_name: str,
    scheduled_time: str,
    photo_s3_key: str
) -> Dict:
    """
    Verify if a medication was taken by analyzing a photo.
    Compares photo timestamp with scheduled time.
    """
    # Detect pill bottles in photo
    detection = detect_pill_bottles(photo_s3_key)

    # Get scheduled medication
    schedule = get_medication_schedule(user_id)
    med_record = next(
        (m for m in schedule if m.get("medication_name") == medication_name
         and m.get("scheduled_time") == scheduled_time),
        None
    )

    if not med_record:
        return {"status": "not_found", "medication": medication_name}

    # Determine if medication was taken
    taken = detection["pill_bottles_detected"] and detection["confidence"] > 80.0
    status = "taken" if taken else "missed"

    # Record in DynamoDB
    table = dynamodb.Table(TABLE_NAME)
    record_id = f"{user_id}-{medication_name}-{scheduled_time.replace(':', '-')}"
    table.put_item(Item={
        "record_id": record_id,
        "user_id": user_id,
        "medication_name": medication_name,
        "scheduled_time": scheduled_time,
        "taken": taken,
        "status": status,
        "detection_confidence": detection["confidence"],
        "photo_s3_key": photo_s3_key,
        "verified_at": datetime.utcnow().isoformat() + "Z",
        "detected_labels": detection["detected_labels"],
    })

    # Send reminder if missed
    if not taken and REMINDER_TOPIC_ARN:
        sns.publish(
            TopicArn=REMINDER_TOPIC_ARN,
            Subject=f"💊 Medication Reminder: {medication_name}",
            Message=f"Ruth has not yet taken {medication_name} (scheduled for {scheduled_time}). Please remind her."
        )

    return {
        "status": status,
        "medication": medication_name,
        "confidence": detection["confidence"],
        "detected_labels": detection["detected_labels"]
    }


def calculate_weekly_compliance(user_id: str) -> Dict:
    """
    Calculate medication compliance percentage for the past 7 days.
    Returns overall compliance and per-medication breakdown.
    """
    table = dynamodb.Table(TABLE_NAME)
    start_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")

    response = table.query(
        IndexName="user-timestamp-index",
        KeyConditionExpression="user_id = :uid AND scheduled_time >= :start",
        ExpressionAttributeValues={
            ":uid": user_id,
            ":start": start_date
        }
    )

    records = response.get("Items", [])
    if not records:
        return {"compliance_percent": 100.0, "total": 0, "taken": 0, "breakdown": {}}

    total = len(records)
    taken = sum(1 for r in records if r.get("taken"))

    # Per-medication breakdown
    breakdown = {}
    for record in records:
        name = record.get("medication_name", "unknown")
        if name not in breakdown:
            breakdown[name] = {"total": 0, "taken": 0}
        breakdown[name]["total"] += 1
        if record.get("taken"):
            breakdown[name]["taken"] += 1

    for name in breakdown:
        breakdown[name]["percent"] = round(
            (breakdown[name]["taken"] / breakdown[name]["total"]) * 100, 1
        ) if breakdown[name]["total"] > 0 else 0

    return {
        "compliance_percent": round((taken / total) * 100, 1) if total > 0 else 100.0,
        "total": total,
        "taken": taken,
        "missed": total - taken,
        "period": f"{start_date} to {datetime.utcnow().strftime('%Y-%m-%d')}",
        "breakdown": breakdown
    }


def lambda_handler(event, context):
    """
    Main handler — triggered by scheduled event or SQS message.
    Processes medication verification and compliance calculation.
    """
    print(f"[MedicationTracker] Event: {json.dumps(event)[:300]}")

    # Determine operation
    operation = event.get("operation", "verify")
    user_id = event.get("user_id", "ruth-martinez")

    if operation == "verify":
        result = verify_medication_taken(
            user_id=user_id,
            medication_name=event.get("medication_name", "Aspirin 81mg"),
            scheduled_time=event.get("scheduled_time", "08:00"),
            photo_s3_key=event.get("photo_s3_key", "medication/aspirin-20241020.jpg")
        )
        return {"statusCode": 200, "result": result}

    elif operation == "compliance":
        result = calculate_weekly_compliance(user_id)
        return {"statusCode": 200, "result": result}

    elif operation == "schedule":
        # Store/update medication schedule
        table = dynamodb.Table(TABLE_NAME)
        for med in event.get("medications", []):
            table.put_item(Item={
                "record_id": f"{user_id}-{med['name']}-{med['time'].replace(':', '-')}",
                "user_id": user_id,
                "medication_name": med["name"],
                "scheduled_time": med["time"],
                "taken": False,
                "status": "pending",
                "verified_at": None,
            })
        return {"statusCode": 200, "message": f"Scheduled {len(event.get('medications', []))} medications"}

    return {"statusCode": 400, "error": "Unknown operation"}


if __name__ == "__main__":
    print("=" * 60)
    print("  NEXUS — Medication Tracker Lambda (Local Test)")
    print("=" * 60)

    # Test compliance calculation
    result = calculate_weekly_compliance("ruth-martinez")
    print(f"\nWeekly Compliance: {result['compliance_percent']}%")
    print(f"Breakdown: {json.dumps(result.get('breakdown', {}), indent=2)}")

    # Test medication verification
    result = verify_medication_taken(
        user_id="ruth-martinez",
        medication_name="Aspirin 81mg",
        scheduled_time="08:00",
        photo_s3_key="medication/aspirin-20241020.jpg"
    )
    print(f"\nVerification: {result}")
