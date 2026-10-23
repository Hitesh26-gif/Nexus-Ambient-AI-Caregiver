"""
Alert Router Lambda — SNS Multi-Channel Notification
====================================================
Consumes fall alerts from SQS and routes them through SNS to:
  - SMS (via Amazon Pinpoint)
  - Email (via SES)
  - Push notification (to caregiver dashboard)
  - Fire TV display update
  - Alexa+ voice notification

AWS Services Used:
  - SQS: Receives decoupled fall events
  - SNS: Fan-out to multiple channels
  - SES: Email delivery for daily/weekly reports
  - Pinpoint: SMS delivery to caregiver phone
"""

import json
import os
import boto3
from datetime import datetime
from typing import Dict, List

# AWS clients
sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "us-east-1"))
ses = boto3.client("ses", region_name=os.environ.get("AWS_REGION", "us-east-1"))
pinpoint = boto3.client("pinpoint", region_name=os.environ.get("AWS_REGION", "us-east-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-east-1"))

# Configuration
SNS_EMERGENCY_TOPIC = os.environ.get("SNS_EMERGENCY_TOPIC_ARN", "")
SNS_REPORT_TOPIC = os.environ.get("SNS_REPORT_TOPIC_ARN", "")
SES_FROM_EMAIL = os.environ.get("SES_FROM_EMAIL", "noreply@nexus.health")
CAREGIVER_PHONE = os.environ.get("CAREGIVER_PHONE", "+15551234567")
CAREGIVER_EMAIL = os.environ.get("CAREGIVER_EMAIL", "mark.martinez@email.com")
TABLE_NAME = os.environ.get("TABLE_NAME", "nexus-alerts")
QUEUE_URL = os.environ.get("SQS_QUEUE_URL", "")


def route_alert(alert_data: Dict) -> Dict[str, str]:
    """
    Route a single alert through all channels.

    Returns delivery status for each channel.
    """
    results = {}

    # ── Channel 1: SNS Emergency Topic (fan-out to subscribers) ─────────────
    if SNS_EMERGENCY_TOPIC:
        try:
            sns.publish(
                TopicArn=SNS_EMERGENCY_TOPIC,
                Subject=f"🚨 {alert_data.get('user_id', 'Unknown')} — {alert_data.get('classification', 'Alert')}",
                Message=json.dumps(alert_data, default=str),
                MessageStructure="json"
            )
            results["sns"] = "sent"
            print(f"[SNS] Alert published to emergency topic")
        except Exception as e:
            results["sns"] = f"error: {str(e)}"
            print(f"[SNS] Error: {e}")

    # ── Channel 2: SMS via Pinpoint ─────────────────────────────────────────
    sms_message = build_sms_message(alert_data)
    try:
        response = pinpoint.send_messages(
            ApplicationId=os.environ.get("PINPOINT_APP_ID", ""),
            MessageRequest={
                "Addresses": {CAREGIVER_PHONE: {"ChannelType": "SMS"}},
                "MessageConfiguration": {
                    "SMSMessage": {
                        "Body": sms_message,
                        "MessageType": "TRANSACTIONAL",
                    }
                }
            }
        )
        results["sms"] = "sent"
        print(f"[Pinpoint] SMS sent to {CAREGIVER_PHONE}")
    except Exception as e:
        results["sms"] = f"error: {str(e)}"
        print(f"[Pinpoint] Error: {e}")

    # ── Channel 3: Email via SES ────────────────────────────────────────────
    try:
        email_body = build_email_body(alert_data)
        ses.send_email(
            Source=SES_FROM_EMAIL,
            Destination={"ToAddresses": [CAREGIVER_EMAIL]},
            Message={
                "Subject": {"Data": f"🚨 Emergency Alert: {alert_data.get('user_id', 'User')}"},
                "Body": {
                    "Text": {"Data": email_body},
                    "Html": {"Data": build_email_html(alert_data)}
                }
            }
        )
        results["email"] = "sent"
        print(f"[SES] Email sent to {CAREGIVER_EMAIL}")
    except Exception as e:
        results["email"] = f"error: {str(e)}"
        print(f"[SES] Error: {e}")

    # ── Channel 4: Store alert in DynamoDB ──────────────────────────────────
    try:
        table = dynamodb.Table(TABLE_NAME)
        alert_id = f"alert-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{os.urandom(4).hex()}"
        table.put_item(Item={
            "alert_id": alert_id,
            "user_id": alert_data.get("user_id", ""),
            "event_type": alert_data.get("event_type", "fall_alert"),
            "severity": alert_data.get("severity", "critical"),
            "classification": alert_data.get("classification", ""),
            "confidence": alert_data.get("confidence", 0),
            "message": alert_data.get("message", ""),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "channels_sent": results,
            "status": "sent"
        })
        results["ddb"] = "stored"
        print(f"[DynamoDB] Alert stored: {alert_id}")
    except Exception as e:
        results["ddb"] = f"error: {str(e)}"

    return results


def build_sms_message(alert_data: Dict) -> str:
    """Build concise SMS for caregiver phone."""
    user = alert_data.get("user_id", "User")
    fall_type = alert_data.get("classification", "Potential fall")
    confidence = alert_data.get("confidence", 0)
    ts = datetime.fromisoformat(alert_data.get("timestamp", "").replace("Z", "+00:00")).strftime("%H:%M")

    return (
        f"NEXUS ALERT: {fall_type} detected for {user} at {ts}. "
        f"Confidence: {confidence:.0%}. "
        f"Check the dashboard for details. Call: (555) 123-4567"
    )


def build_email_body(alert_data: Dict) -> str:
    """Build plain-text email body."""
    user = alert_data.get("user_id", "User")
    ts = alert_data.get("timestamp", "")
    return f"""
NEXUS Emergency Alert
=====================

User: {user}
Event: {alert_data.get('classification', 'Fall Detected')}
Time: {ts}
Confidence: {alert_data.get('confidence', 0):.1%}
Max Acceleration: {alert_data.get('max_acceleration_g', 'N/A')}g

Please check the Nexus dashboard immediately.
-- Nexus Care System
    """.strip()


def build_email_html(alert_data: Dict) -> str:
    """Build HTML email with styling."""
    severity_color = "#D32F2F" if alert_data.get("severity") == "critical" else "#F57C00"
    return f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: {severity_color}; color: white; padding: 20px; text-align: center;">
    <h1>🚨 NEXUS EMERGENCY ALERT</h1>
  </div>
  <div style="padding: 20px;">
    <p><strong>User:</strong> {alert_data.get('user_id', 'Unknown')}</p>
    <p><strong>Event:</strong> {alert_data.get('classification', 'Fall Detected')}</p>
    <p><strong>Time:</strong> {alert_data.get('timestamp', '')}</p>
    <p><strong>Confidence:</strong> {alert_data.get('confidence', 0):.1%}</p>
    <hr>
    <p>Please check the <a href="https://nexus.health/dashboard">Nexus Dashboard</a> for live updates.</p>
    <p>Emergency contact: <a href="tel:+15551234567">(555) 123-4567</a></p>
  </div>
  <div style="background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
    This is an automated message from Nexus Care System.
  </div>
</body>
</html>
    """.strip()


def lambda_handler(event, context):
    """
    SQS consumer — processes fall alerts from the queue.
    Each SQS message triggers multi-channel alert routing.
    """
    print(f"[AlertRouter] Received {len(event.get('Records', []))} messages")

    all_results = {}
    for record in event.get("Records", []):
        try:
            body = json.loads(record["body"])
            # Handle both direct events and IoT-wrapped events
            alert_data = body.get("payload", body)
            if "Records" in alert_data:
                alert_data = alert_data["Records"][0].get("payload", {})

            print(f"[AlertRouter] Processing alert for user: {alert_data.get('user_id', 'unknown')}")
            results = route_alert(alert_data)
            all_results[record.get("messageId", "unknown")] = results

            # Delete from SQS after successful processing
            sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION", "us-east-1"))
            sqs.delete_message(
                QueueUrl=QUEUE_URL,
                ReceiptHandle=record["receiptHandle"]
            )

        except Exception as e:
            print(f"[AlertRouter] Error processing message: {e}")
            all_results[record.get("messageId", "unknown")] = {"error": str(e)}

    return {
        "statusCode": 200,
        "body": json.dumps({"alerts_processed": len(all_results), "results": all_results})
    }


if __name__ == "__main__":
    print("=" * 60)
    print("  NEXUS — Alert Router Lambda (Local Test)")
    print("=" * 60)

    test_alert = {
        "event_type": "fall_detection",
        "user_id": "ruth-martinez",
        "classification": "fall",
        "confidence": 0.947,
        "severity": "critical",
        "max_acceleration_g": 12.4,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message": "Fall detected via Bee wearable sensor fusion"
    }

    results = route_alert(test_alert)
    print(f"\nDelivery results: {json.dumps(results, indent=2)}")
