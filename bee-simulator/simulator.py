"""
Bee Wearable — Main Simulator Loop
Continuously generates sensor data, classifies falls, and outputs events.
Simulates a realistic day-in-the-life for Ruth (78F).
"""

import json
import time
import sys
import os
from datetime import datetime

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sensor_generator import generate_stream, classify_fall

# Activity schedule for a realistic day
ACTIVITY_SCHEDULE = [
    ("resting", 15),     # Waking up, in bed
    ("walking", 30),     # Morning routine, walking around
    ("resting", 20),     # Sitting, reading
    ("walking", 25),     # Kitchen, getting water
    ("resting", 10),     # Phone call with son
    ("walking", 20),     # Walking to bedroom
    ("falling", 8),      # THE FALL — slip on rug
    ("resting", 60),     # Lying on floor, waiting for help
    ("walking", 15),     # (Simulated recovery for demo)
    ("resting", 10),     # Back in chair, post-incident
]


def print_reading(reading: dict):
    """Pretty-print a single sensor reading."""
    ts = reading["timestamp"][11:19]  # HH:MM:SS
    acc = reading["accelerometer"]
    gyro = reading["gyroscope"]
    print(f"  [{ts}] acc=[{acc['x_g']:+.2f}, {acc['y_g']:+.2f}, {acc['z_g']:+.2f}]g  "
          f"gyro=[{gyro['x_dps']:+.0f}, {gyro['y_dps']:+.0f}, {gyro['z_dps']:+.0f}]°/s  "
          f"mag={acc['magnitude_g']:.2f}g  battery={reading['battery_percent']}%")


def print_classification(result: dict):
    """Pretty-print fall classification with visual indicator."""
    emoji = {"fall": "🔴", "possible_fall": "🟡", "normal_activity": "🟢",
             "insufficient_data": "⚪"}
    icon = emoji.get(result["classification"], "⚪")
    print(f"\n{icon} CLASSIFICATION: {result['classification'].upper()}")
    print(f"    Confidence: {result['confidence']:.1%}")
    print(f"    Max acceleration: {result['max_acceleration_g']:.2f}g")
    print(f"    Max gyroscope: {result['max_gyro dps']:.0f}°/s")
    print(f"    Score breakdown:")
    for score, value in result["scores"].items():
        bar = "█" * int(value * 20)
        print(f"      {score:12s}: {bar} {value:.2f}")
    print()


def simulate_day(skip_delay: bool = False):
    """
    Run the full day simulation.
    Each activity runs at simulated 20Hz but compressed for demo speed.
    """
    print("=" * 70)
    print("  NEXUS — Bee Wearable Simulator")
    print("  User: Ruth Martinez (78F) | Device: bee-ruth-001")
    print("=" * 70)
    print()

    for activity, duration in ACTIVITY_SCHEDULE:
        print("\n" + "=" * 70)
        print(f"  Activity: {activity.upper()} ({duration}s simulated)")
        print(f"{'─' * 70}")

        stream = generate_stream(activity, duration_seconds=duration, sample_rate=20.0)
        readings_buffer = []
        readings_per_print = 5  # Show every 5th reading for readability

        for i, reading in enumerate(stream):
            readings_buffer.append(reading)

            # Print select readings for visibility
            if i % readings_per_print == 0:
                print_reading(reading)

            # Classify every 20 readings (1 second of data)
            if (i + 1) % 20 == 0 and len(readings_buffer) >= 20:
                result = classify_fall(readings_buffer[-60:])  # 3-second window
                if result["classification"] in ("fall", "possible_fall"):
                    print_classification(result)
                    # Send to downstream (IoT Core / Lambda)
                    event = {
                        "event_type": "fall_detection",
                        "classification": result["classification"],
                        "confidence": result["confidence"],
                        "sensor_data": readings_buffer[-20:],  # Last 1 second
                        "timestamp": result["timestamp"],
                        "device_id": reading["device_id"],
                        "user_id": reading["user_id"]
                    }
                    print(f"  📡 PUBLISHING to IoT Core / SQS:")
                    print(f"     {json.dumps(event, indent=2)[:200]}...")

                    # In production, this would publish to IoT Core topic
                    # aws_iot.publish(topic="nexus/falls", payload=json.dumps(event))
                    if result["classification"] == "fall":
                        print("\n  🚨 EMERGENCY CASCADE INITIATED")
                        print("     → SQS: nexus-emergency-queue")
                        print("     → SNS: alert-ruth-martinez")
                        print("     → DynamoDB: emergency-events")
                        print("     → S3: ring-snapshots/")
                        # In demo, we pause briefly to let the user see this
                        if not skip_delay:
                            time.sleep(2)

        # Hold the last few readings for final classification
        if len(readings_buffer) >= 20:
            final_result = classify_fall(readings_buffer)
            if activity == "falling":
                print_classification(final_result)

        # Simulate real-time pacing (compress to 10x for demo)
        if not skip_delay:
            time.sleep(max(0.5, duration / 10))

    print(f"\n{'═' * 70}")
    print("  Day simulation complete.")
    print("  Next: AWS Lambda processing → Alert routing → Dashboard update")
    print("═" * 70)


if __name__ == "__main__":
    skip = "--fast" in sys.argv
    try:
        simulate_day(skip_delay=skip)
    except KeyboardInterrupt:
        print("\n\nSimulation interrupted by user.")
        sys.exit(0)
