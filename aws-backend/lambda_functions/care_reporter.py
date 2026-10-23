"""
Care Reporter Lambda — Daily/Weekly SES Reports
================================================
Generates comprehensive care reports and sends via SES.
Includes: vitals summary, fall events, medication compliance,
activity patterns, and recommendations.

AWS Services Used:
  - DynamoDB: Read vitals, alerts, medication data
  - SES: Send formatted HTML emails to caregivers
  - S3: Generate PDF reports (via Lambda + PDF library)
  - SNS: Notify when report is ready
"""

import json
import os
import boto3
from datetime import datetime, timedelta
from typing import Dict, List

# AWS clients
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-east-1"))
ses = boto3.client("ses", region_name=os.environ.get("AWS_REGION", "us-east-1"))
sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "us-east-1"))

VITALS_TABLE = os.environ.get("VITALS_TABLE", "nexus-vitals")
ALERTS_TABLE = os.environ.get("ALERTS_TABLE", "nexus-alerts")
MEDICATION_TABLE = os.environ.get("MEDICATION_TABLE", "nexus-medication")
REPORT_RECIPIENTS = os.environ.get("REPORT_RECIPIENTS", "mark.martinez@email.com").split(",")


def generate_daily_report(user_id: str, date: str = None) -> Dict:
    """
    Generate a comprehensive daily care report.

    Includes:
    1. Vitals summary (heart rate, BP, SpO2 trends)
    2. Fall events and classifications
    3. Medication compliance
    4. Activity patterns
    5. Care recommendations
    """
    if date is None:
        date = datetime.utcnow().strftime("%Y-%m-%d")

    report = {
        "user_id": user_id,
        "report_date": date,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "report_type": "daily",
        "vitals_summary": _get_vitals_summary(user_id, date),
        "fall_events": _get_fall_events(user_id, date),
        "medication_compliance": _get_medication_compliance(user_id, date),
        "activity_summary": _get_activity_summary(user_id, date),
        "recommendations": [],
    }

    # Generate recommendations based on data
    report["recommendations"] = _generate_recommendations(report)

    return report


def _get_vitals_summary(user_id: str, date: str) -> Dict:
    """Query DynamoDB for vitals data for the given date."""
    table = dynamodb.Table(VITALS_TABLE)
    start = f"{date}T00:00:00Z"
    end = f"{date}T23:59:59Z"

    response = table.query(
        IndexName="user-timestamp-index",
        KeyConditionExpression="user_id = :uid AND timestamp BETWEEN :start AND :end",
        ExpressionAttributeValues={
            ":uid": user_id,
            ":start": start,
            ":end": end
        },
        ScanIndexForward=False,  # Most recent first
        Limit=100
    )

    items = response.get("Items", [])
    if not items:
        return {"status": "no_data", "note": "No vitals recorded for this date"}

    # Aggregate vitals
    heart_rates = [i.get("heart_rate") for i in items if i.get("heart_rate")]
    bp_systolic = [i.get("bp_systolic") for i in items if i.get("bp_systolic")]
    bp_diastolic = [i.get("bp_diastolic") for i in items if i.get("bp_diastolic")]
    spo2 = [i.get("spo2") for i in items if i.get("spo2")]

    return {
        "readings_count": len(items),
        "heart_rate": {
            "avg": round(sum(heart_rates) / len(heart_rates), 1) if heart_rates else None,
            "min": min(heart_rates) if heart_rates else None,
            "max": max(heart_rates) if heart_rates else None,
            "last": heart_rates[-1] if heart_rates else None,
        },
        "blood_pressure": {
            "avg_systolic": round(sum(bp_systolic) / len(bp_systolic), 1) if bp_systolic else None,
            "avg_diastolic": round(sum(bp_diastolic) / len(bp_diastolic), 1) if bp_diastolic else None,
        },
        "spo2": {
            "avg": round(sum(spo2) / len(spo2), 1) if spo2 else None,
            "last": spo2[-1] if spo2 else None,
        },
        "last_reading": items[0].get("timestamp"),
    }


def _get_fall_events(user_id: str, date: str) -> List[Dict]:
    """Query alerts table for fall events."""
    table = dynamodb.Table(ALERTS_TABLE)
    start = f"{date}T00:00:00Z"
    end = f"{date}T23:59:59Z"

    response = table.query(
        IndexName="user-timestamp-index",
        KeyConditionExpression="user_id = :uid AND timestamp BETWEEN :start AND :end",
        ExpressionAttributeValues={":uid": user_id, ":start": start, ":end": end, ":fall": "fall"},
        FilterExpression="event_type = :fall"
    )
    return response.get("Items", [])


def _get_medication_compliance(user_id: str, date: str) -> Dict:
    """Query medication table for compliance."""
    table = dynamodb.Table(MEDICATION_TABLE)
    start = f"{date}T00:00:00Z"
    end = f"{date}T23:59:59Z"

    response = table.query(
        IndexName="user-timestamp-index",
        KeyConditionExpression="user_id = :uid AND scheduled_time BETWEEN :start AND :end",
        ExpressionAttributeValues={":uid": user_id, ":start": start, ":end": end}
    )

    records = response.get("Items", [])
    if not records:
        return {"status": "no_data", "compliance_percent": None}

    taken = sum(1 for r in records if r.get("taken"))
    return {
        "total_doses": len(records),
        "taken": taken,
        "missed": len(records) - taken,
        "compliance_percent": round((taken / len(records)) * 100, 1) if records else 0,
        "details": [
            {"medication": r.get("medication_name"), "time": r.get("scheduled_time"),
             "taken": r.get("taken"), "verified_at": r.get("verified_at")}
            for r in records
        ]
    }


def _get_activity_summary(user_id: str, date: str) -> Dict:
    """Summarize activity patterns from vitals."""
    table = dynamodb.Table(VITALS_TABLE)
    start = f"{date}T00:00:00Z"
    end = f"{date}T23:59:59Z"

    response = table.query(
        IndexName="user-timestamp-index",
        KeyConditionExpression="user_id = :uid AND timestamp BETWEEN :start AND :end",
        ExpressionAttributeValues={":uid": user_id, ":start": start, ":end": end}
    )

    items = response.get("Items", [])
    if not items:
        return {"total_readings": 0, "avg_movement": 0}

    # Calculate average magnitude (movement indicator)
    magnitudes = [i.get("magnitude", 0) for i in items if i.get("magnitude")]
    avg_magnitude = sum(magnitudes) / len(magnitudes) if magnitudes else 0

    return {
        "total_readings": len(items),
        "avg_acceleration_magnitude": round(avg_magnitude, 4),
        "active_hours": len(set(i.get("timestamp", "")[:13] for i in items)),
    }


def _generate_recommendations(report: Dict) -> List[str]:
    """Generate care recommendations based on report data."""
    recs = []

    # Vitals check
    vitals = report.get("vitals_summary", {})
    if vitals.get("heart_rate", {}).get("avg"):
        hr = vitals["heart_rate"]["avg"]
        if hr > 100:
            recs.append(f"⚠️ Heart rate avg {hr} bpm is elevated. Consider consulting a physician.")
        elif hr < 60:
            recs.append(f"⚠️ Heart rate avg {hr} bpm is low. Monitor for dizziness.")

    if vitals.get("blood_pressure", {}).get("avg_systolic"):
        sys = vitals["blood_pressure"]["avg_systolic"]
        if sys > 140:
            recs.append(f"⚠️ Systolic BP avg {sys} mmHg is high. Review medication adherence.")

    # Fall check
    falls = report.get("fall_events", [])
    if falls:
        recs.append(f"🚨 {len(falls)} fall event(s) detected. Review camera footage and check home safety.")

    # Medication check
    med = report.get("medication_compliance", {})
    if med.get("compliance_percent") is not None and med["compliance_percent"] < 90:
        recs.append(f"💊 Medication compliance at {med['compliance_percent']}%. Follow up on missed doses.")

    if not recs:
        recs.append("✅ All metrics within normal range. Continue current care plan.")

    return recs


def send_report(report: Dict, recipients: List[str] = None):
    """Send report via SES to configured recipients."""
    if recipients is None:
        recipients = REPORT_RECIPIENTS

    user = report["user_id"]
    date = report["report_date"]
    body_text = _format_text_report(report)
    body_html = _format_html_report(report)

    ses.send_email(
        Source=os.environ.get("SES_FROM_EMAIL", "noreply@nexus.health"),
        Destination={"ToAddresses": recipients},
        Message={
            "Subject": {"Data": f"📋 Nexus Daily Care Report — {user} ({date})"},
            "Body": {
                "Text": {"Data": body_text},
                "Html": {"Data": body_html}
            }
        }
    )
    print(f"[SES] Report sent to {recipients}")


def _format_text_report(report: Dict) -> str:
    """Format report as plain text."""
    lines = [
        f"NEXUS DAILY CARE REPORT",
        f"{'=' * 40}",
        f"User: {report['user_id']}",
        f"Date: {report['report_date']}",
        f"Generated: {report['generated_at']}",
        "",
        "VITALS SUMMARY:",
        f"  Heart Rate: {report['vitals_summary'].get('heart_rate', {}).get('avg', 'N/A')} bpm",
        f"  Blood Pressure: {report['vitals_summary'].get('blood_pressure', {}).get('avg_systolic', 'N/A')}/{report['vitals_summary'].get('blood_pressure', {}).get('avg_diastolic', 'N/A')} mmHg",
        f"  SpO2: {report['vitals_summary'].get('spo2', {}).get('avg', 'N/A')}%",
        "",
        "FALL EVENTS:",
        f"  Count: {len(report.get('fall_events', []))}",
        "",
        "MEDICATION COMPLIANCE:",
        f"  Rate: {report.get('medication_compliance', {}).get('compliance_percent', 'N/A')}%",
        "",
        "RECOMMENDATIONS:",
    ]
    for rec in report.get("recommendations", []):
        lines.append(f"  • {rec}")
    return "\n".join(lines)


def _format_html_report(report: Dict) -> str:
    """Format report as styled HTML."""
    warnings = [r for r in report.get("recommendations", []) if "⚠️" in r or "🚨" in r]
    warning_color = "#D32F2F" if warnings else "#4CAF50"

    return f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a237e, #0d47a1); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">📋 NEXUS Daily Report</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">{report['user_id']} · {report['report_date']}</p>
  </div>

  <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">

    <h2 style="color: #1a237e; border-bottom: 2px solid #e3f2fd; padding-bottom: 10px;">Vital Signs</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Heart Rate</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">{report['vitals_summary'].get('heart_rate', {}).get('avg', 'N/A')} bpm</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Blood Pressure</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">{report['vitals_summary'].get('blood_pressure', {}).get('avg_systolic', 'N/A')}/{report['vitals_summary'].get('blood_pressure', {}).get('avg_diastolic', 'N/A')} mmHg</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>SpO2</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">{report['vitals_summary'].get('spo2', {}).get('avg', 'N/A')}%</td></tr>
      <tr><td style="padding: 8px;"><strong>Last Reading</strong></td><td style="padding: 8px; text-align: right;">{report['vitals_summary'].get('last_reading', 'N/A')}</td></tr>
    </table>

    <h2 style="color: #1a237e; margin-top: 30px; border-bottom: 2px solid #e3f2fd; padding-bottom: 10px;">Fall Events</h2>
    <p>🚨 {len(report.get('fall_events', []))} event(s) today</p>

    <h2 style="color: #1a237e; margin-top: 30px; border-bottom: 2px solid #e3f2fd; padding-bottom: 10px;">Medication Compliance</h2>
    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
      <span style="font-size: 36px; font-weight: bold; color: #2e7d32;">
        {report.get('medication_compliance', {}).get('compliance_percent', 'N/A')}%
      </span>
      <p style="margin: 5px 0 0; color: #666;">
        {report.get('medication_compliance', {}).get('taken', 0)} of {report.get('medication_compliance', {}).get('total_doses', 0)} doses taken
      </p>
    </div>

    <h2 style="color: #1a237e; margin-top: 30px; border-bottom: 2px solid #e3f2fd; padding-bottom: 10px;">Recommendations</h2>
    <div style="background: {'#ffebee' if warnings else '#e8f5e9'}; padding: 15px; border-radius: 8px; border-left: 4px solid {warning_color};">
      {"".join('<p style="margin: 5px 0;">' + rec + '</p>' for rec in report.get("recommendations", []))}
    </div>

    <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
      <p style="color: #666; margin: 0;">🔗 <a href="https://nexus.health/dashboard" style="color: #1a237e;">View Full Dashboard</a></p>
      <p style="color: #999; font-size: 12px; margin: 10px 0 0;">Report generated by Nexus Care System</p>
    </div>
  </div>
</body>
</html>
    """.strip()


def lambda_handler(event, context):
    """
    Scheduled Lambda — triggered daily at 8:00 AM and weekly on Mondays.
    Generates and sends care reports to all configured recipients.
    """
    report_type = event.get("report_type", "daily")
    user_id = event.get("user_id", "ruth-martinez")
    date = event.get("date", datetime.utcnow().strftime("%Y-%m-%d"))

    print(f"[CareReporter] Generating {report_type} report for {user_id}")

    report = generate_daily_report(user_id, date)
    send_report(report)

    # Also publish to SNS for dashboard real-time update
    if SNS := os.environ.get("REPORT_TOPIC_ARN"):
        sns.publish(
            TopicArn=SNS,
            Subject=f"📋 {report_type.title()} Report Ready: {user_id}",
            Message=json.dumps({
                "type": "care_report",
                "report_type": report_type,
                "user_id": user_id,
                "date": date,
                "compliance": report.get("medication_compliance", {}).get("compliance_percent"),
                "fall_count": len(report.get("fall_events", [])),
                "warnings": len([r for r in report.get("recommendations", []) if "⚠️" in r]),
            })
        )

    return {
        "statusCode": 200,
        "body": json.dumps({
            "user_id": user_id,
            "report_type": report_type,
            "compliance": report.get("medication_compliance", {}).get("compliance_percent"),
            "falls": len(report.get("fall_events", [])),
            "recommendations_count": len(report.get("recommendations", [])),
        })
    }


if __name__ == "__main__":
    print("=" * 60)
    print("  NEXUS — Care Reporter Lambda (Local Test)")
    print("=" * 60)

    report = generate_daily_report("ruth-martinez")
    print(json.dumps(report, indent=2, default=str))
    send_report(report)
