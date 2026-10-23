"""
Snapshot Service — S3 Storage & Rekognition Processing Pipeline
===============================================================
Manages the full lifecycle of emergency snapshots:
1. Ingest from Ring API
2. Upload to S3 with metadata
3. Trigger Rekognition analysis (async)
4. Store results in DynamoDB
5. Publish to SNS for alert delivery
"""

import os
import json
import boto3
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, asdict

# AWS clients
s3 = boto3.client("s3")
rekognition = boto3.client("rekognition", region_name=os.getenv("REKOGNITION_REGION", "us-east-1"))
dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns", region_name=os.getenv("AWS_REGION", "us-east-1"))

S3_BUCKET = os.environ.get("S3_BUCKET", "nexus-emergency-snapshots")
ALERT_TOPIC_ARN = os.environ.get("ALERT_TOPIC_ARN",
    "arn:aws:sns:us-east-1:123456789012:nexus-emergency-alerts")
TABLE_NAME = os.environ.get("TABLE_NAME", "nexus-snapshots")


@dataclass
class SnapshotMetadata:
    """Metadata stored alongside each emergency snapshot."""
    snapshot_id: str
    user_id: str
    camera_id: str
    camera_name: str
    location: str
    timestamp: str
    event_type: str  # "fall", "medical", "intrusion", etc.
    s3_key: str
    s3_etag: str = ""
    # Rekognition results (populated after processing)
    faces_detected: int = 0
    face_matches: list = None
    objects_detected: list = None
    safety_labels: list = None
    processed: bool = False
    process_error: str = ""


def upload_snapshot(image_bytes: bytes, s3_key: str, metadata: SnapshotMetadata) -> dict:
    """
    Upload emergency snapshot to S3 with server-side encryption.

    AWS Service: Amazon S3
    - Bucket: nexus-emergency-snapshots (encrypted with SSE-KMS)
    - Key format: emergency/{user_id}/{timestamp}/{snapshot_id}.jpg
    - Access: Restricted to Lambda execution role
    """
    extra_args = {
        "ServerSideEncryption": "aws:kms",
        "ContentType": "image/jpeg",
        "Metadata": {
            "user-id": metadata.user_id,
            "camera-id": metadata.camera_id,
            "event-type": metadata.event_type,
            "created-at": metadata.timestamp,
        }
    }

    response = s3.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=image_bytes,
        **extra_args
    )

    metadata.s3_etag = response["ETag"]
    print(f"[S3] Uploaded: s3://{S3_BUCKET}/{s3_key} (ETag: {response['ETag']})")
    return response


def analyze_with_rekognition(s3_key: str) -> dict:
    """
    Run Rekognition analysis on stored snapshot.

    AWS Service: Amazon Rekognition
    1. DetectFaces — identify people, estimate age/gender/emotion
    2. DetectLabels — identify objects (pill bottles, hazards)
    3. CompareFaces — verify against known person collection

    Returns analysis results for storage in DynamoDB.
    """
    results = {
        "faces": [],
        "labels": [],
        "face_matches": [],
        "safety_recommendations": []
    }

    # ── Step 1: Face Detection ───────────────────────────────────────────────
    # In production, compare against the "nexus-family" Rekognition collection
    # to verify the elderly person is present and identify unknown visitors
    face_response = rekognition.detect_faces(
        Image={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
        Attributes=["ALL"]
    )

    for face in face_response.get("FaceDetails", []):
        face_data = {
            "face_id": face.get("FaceId"),
            "confidence": face.get("Confidence"),
            "bounding_box": face.get("BoundingBox"),
            "age_range": face.get("AgeRange", {}),
            "gender": face.get("Gender", {}),
            "emotions": [e["Type"] for e in face.get("Emotions", [])],
            "emotional_state": _get_dominant_emotion(face.get("Emotions", [])),
        }
        results["faces"].append(face_data)

    # ── Step 2: Label/Object Detection ──────────────────────────────────────
    label_response = rekognition.detect_labels(
        Image={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
        MaxLabels=30,
        MinConfidence=70.0
    )

    relevant_labels = []
    for label in label_response.get("Labels", []):
        label_data = {"name": label["Name"], "confidence": label["Confidence"]}
        results["labels"].append(label_data)

        # Check for safety-relevant labels
        if label["Name"] in ("Fall", "Floor", "Stairs", "Wet Floor", "Rug",
                              "Pill Bottle", "Medication", "Wheelchair", "Walker"):
            relevant_labels.append(label_data)

    results["safety_recommendations"] = _generate_safety_recommendations(relevant_labels)

    # ── Step 3: Face Verification (if collection exists) ─────────────────────
    # Compare detected faces against the known-persons collection
    # This verifies if Ruth is in the frame and identifies visitors
    try:
        collection_response = rekognition.list_collections()
        if "nexus-family" in collection_response.get("CollectionIds", []):
            compare_response = rekognition.compare_faces(
                SourceImage={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
                TargetImage={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
                CollectionId="nexus-family",
                SimilarityThreshold=85.0
            )
            results["face_matches"] = compare_response.get("FaceMatches", [])
    except Exception as e:
        results["face_matches"] = []
        print(f"[Rekognition] Face comparison skipped: {e}")

    return results


def _get_dominant_emotion(emotions: list) -> str:
    """Extract the dominant emotion from Rekognition emotion data."""
    if not emotions:
        return "unknown"
    return max(emotions, key=lambda e: e.get("Confidence", 0))["Type"]


def _generate_safety_recommendations(relevant_labels: list) -> list:
    """Generate safety recommendations based on detected objects."""
    recommendations = []
    label_names = [l["name"].lower() for l in relevant_labels]

    if "fall" in label_names or "floor" in label_names:
        recommendations.append("Person appears to be on the floor. Verify if assistance is needed.")
    if "rug" in label_names:
        recommendations.append("Loose rug detected — potential tripping hazard.")
    if "pill bottle" in label_names:
        recommendations.append("Medication containers visible — verify adherence.")
    if "wet floor" in label_names:
        recommendations.append("Wet floor detected — slip hazard identified.")

    return recommendations


def store_metadata(metadata: SnapshotMetadata, rekognition_results: dict):
    """
    Store snapshot metadata and Rekognition results in DynamoDB.

    AWS Service: Amazon DynamoDB
    Table: nexus-snapshots
    Key: snapshot_id (partition key)
    GSI: user_id + timestamp (for querying by user)
    """
    table = dynamodb.Table(TABLE_NAME)

    item = {
        "snapshot_id": metadata.snapshot_id,
        "user_id": metadata.user_id,
        "camera_id": metadata.camera_id,
        "camera_name": metadata.camera_name,
        "location": metadata.location,
        "timestamp": metadata.timestamp,
        "event_type": metadata.event_type,
        "s3_key": metadata.s3_key,
        "s3_etag": metadata.s3_etag,
        "faces_detected": metadata.faces_detected,
        "face_matches": metadata.face_matches or [],
        "objects_detected": metadata.objects_detected or [],
        "safety_recommendations": rekognition_results.get("safety_recommendations", []),
        "processed": True,
        "process_error": metadata.process_error,
        "processed_at": datetime.now().isoformat(),
    }

    table.put_item(Item=item)
    print(f"[DynamoDB] Stored snapshot metadata: {metadata.snapshot_id}")
    return item


def publish_alert_notification(snapshot_id: str, metadata: SnapshotMetadata,
                                rekognition_results: dict):
    """
    Publish emergency notification via SNS when snapshot is ready.

    AWS Service: Amazon SNS
    Topic: nexus-emergency-alerts
    Subscribers: SMS (Pinpoint), Email (SES), Lambda (dashboard webhook)
    """
    message = {
        "type": "emergency_snapshot_ready",
        "snapshot_id": snapshot_id,
        "user_id": metadata.user_id,
        "camera_name": metadata.camera_name,
        "location": metadata.location,
        "s3_key": metadata.s3_key,
        "image_url": f"https://{S3_BUCKET}.s3.amazonaws.com/{metadata.s3_key}",
        "faces_detected": metadata.faces_detected,
        "safety_recommendations": rekognition_results.get("safety_recommendations", []),
        "timestamp": metadata.timestamp,
    }

    sns.publish(
        TopicArn=ALERT_TOPIC_ARN,
        Message=json.dumps(message),
        Subject=f"📸 Emergency Snapshot: {metadata.camera_name}",
        MessageStructure="json"
    )
    print(f"[SNS] Published alert for snapshot: {snapshot_id}")


def process_emergency_snapshot(image_bytes: bytes, event_type: str,
                                 camera_id: str, camera_name: str,
                                 location: str, user_id: str) -> dict:
    """
    Full pipeline: ingest → store → analyze → notify.
    Called by Lambda when fall is detected.
    """
    snapshot_id = f"snap-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    timestamp = datetime.now().isoformat()
    s3_key = f"emergency/{user_id}/{timestamp.replace(':', '-')}/{snapshot_id}.jpg"

    # Step 1: Upload to S3
    upload_snapshot(image_bytes, s3_key, SnapshotMetadata(
        snapshot_id=snapshot_id, user_id=user_id, camera_id=camera_id,
        camera_name=camera_name, location=location, timestamp=timestamp,
        event_type=event_type, s3_key=s3_key
    ))

    # Step 2: Rekognition analysis
    rekognition_results = analyze_with_rekognition(s3_key)

    # Step 3: Store in DynamoDB
    metadata = SnapshotMetadata(
        snapshot_id=snapshot_id, user_id=user_id, camera_id=camera_id,
        camera_name=camera_name, location=location, timestamp=timestamp,
        event_type=event_type, s3_key=s3_key,
        faces_detected=len(rekognition_results["faces"]),
        face_matches=rekognition_results["face_matches"],
        objects_detected=[l["name"] for l in rekognition_results["labels"]],
    )
    stored = store_metadata(metadata, rekognition_results)

    # Step 4: Notify via SNS
    publish_alert_notification(snapshot_id, metadata, rekognition_results)

    return {
        "snapshot_id": snapshot_id,
        "s3_key": s3_key,
        "faces_detected": len(rekognition_results["faces"]),
        "safety_recommendations": rekognition_results["safety_recommendations"],
        "status": "processed"
    }


if __name__ == "__main__":
    import uuid
    print("=" * 60)
    print("  NEXUS — Snapshot Service")
    print("=" * 60)

    # Simulate emergency snapshot processing
    print("\n[Simulating emergency snapshot pipeline...]")

    # Mock image data (in production, this comes from Ring API)
    mock_image_bytes = b"FAKE_IMAGE_BYTES"

    result = process_emergency_snapshot(
        image_bytes=mock_image_bytes,
        event_type="fall",
        camera_id="ring-camera-003",
        camera_name="Kitchen",
        location="kitchen",
        user_id="ruth-martinez"
    )

    print(f"\n[Result] {json.dumps(result, indent=2)}")
    print("\n[Done] Snapshot pipeline complete.")
