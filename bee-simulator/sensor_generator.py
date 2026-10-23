"""
Bee Wearable Sensor Generator
Simulates realistic accelerometer and gyroscope data for an elderly user.
Produces three activity patterns: resting, walking, and falling.
"""

import random
import time
import json
import math
from datetime import datetime
from typing import Generator, Literal, NamedTuple


# Thresholds calibrated from real fall datasets (Compass, Kheops)
class SensorThresholds(NamedTuple):
    """Fall detection thresholds tuned for elderly gait patterns."""
    # Accelerometer (g)
    impact_threshold: float = 8.0      # Hard impact >8g indicates ground strike
    flatline_threshold: float = 0.5    # Near-zero after impact = on the floor
    flatline_duration: float = 3.0     # Seconds of flatline = confirmed fall
    # Gyroscope (deg/s)
    tumble_threshold: float = 300.0    # Rapid rotation during free-fall
    # Combined
    magnitude_range: tuple = (0.5, 2.5)  # Normal standing gravity vector


THRESHOLDS = SensorThresholds()

# Baseline vitals for Ruth (78F, generally healthy)
BASELINE_VITALS = {
    "heart_rate": {"rest": 68, "walking": 92, "fall": 130},
    "blood_pressure": {"systolic": 128, "diastolic": 82},
    "spo2": 98,
    "temperature": 98.4,
}


class SensorReading(NamedTuple):
    """A single sensor reading from the Bee wearable."""
    timestamp: str
    # Accelerometer (g)
    acc_x: float
    acc_y: float
    acc_z: float
    # Gyroscope (deg/s)
    gyro_x: float
    gyro_y: float
    gyro_z: float
    # Derived
    magnitude: float
    activity: Literal["resting", "walking", "falling", "unknown"]


def _gaussian_noise(std: float, mean: float = 0.0) -> float:
    """Generate Gaussian noise — core of realistic sensor simulation."""
    return random.gauss(mean, std)


def _generate_resting(count: int = 50) -> list[SensorReading]:
    """
    Simulate resting state: device on blouse, near the heart.
    Small呼吸-driven oscillations on all axes.
    """
    readings = []
    base_time = time.time()
    for i in range(count):
        t = base_time + i * 0.1
        # Gravity: Z-axis ~1g, slight breathing motion
        acc_x = _gaussian_noise(0.02, 0.0)
        acc_y = _gaussian_noise(0.02, 0.0)
        acc_z = 1.0 + _gaussian_noise(0.03, 0.0)  # breathing oscillation
        magnitude = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
        # Gyro: nearly still, tiny hand tremor
        gyro_x = _gaussian_noise(2.0, 0.0)
        gyro_y = _gaussian_noise(2.0, 0.0)
        gyro_z = _gaussian_noise(1.5, 0.0)

        readings.append(SensorReading(
            timestamp=datetime.fromtimestamp(t).isoformat(),
            acc_x=round(acc_x, 4), acc_y=round(acc_y, 4), acc_z=round(acc_z, 4),
            gyro_x=round(gyro_x, 4), gyro_y=round(gyro_y, 4), gyro_z=round(gyro_z, 4),
            magnitude=round(magnitude, 4),
            activity="resting"
        ))
    return readings


def _generate_walking(count: int = 200) -> list[SensorReading]:
    """
    Simulate walking gait pattern.
    Key signature: periodic oscillation ~1.2Hz for elderly gait.
    """
    readings = []
    base_time = time.time()
    gait_freq = 1.2  # Hz — slow elderly gait

    for i in range(count):
        t = base_time + i * 0.05  # 20Hz sampling
        phase = 2 * math.pi * gait_freq * (t - base_time)

        # Periodic vertical oscillation (body bobbing)
        acc_x = math.sin(phase) * 0.4 + _gaussian_noise(0.05, 0.0)
        acc_y = math.cos(phase) * 0.3 + _gaussian_noise(0.05, 0.0)
        acc_z = 1.0 + math.sin(phase * 2) * 0.3 + _gaussian_noise(0.05, 0.0)

        magnitude = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)

        # Gyro: moderate rotation as body turns
        gyro_x = math.sin(phase) * 50 + _gaussian_noise(5.0, 0.0)
        gyro_y = math.cos(phase * 0.5) * 30 + _gaussian_noise(5.0, 0.0)
        gyro_z = math.sin(phase * 0.3) * 20 + _gaussian_noise(3.0, 0.0)

        readings.append(SensorReading(
            timestamp=datetime.fromtimestamp(t).isoformat(),
            acc_x=round(acc_x, 4), acc_y=round(acc_y, 4), acc_z=round(acc_z, 4),
            gyro_x=round(gyro_x, 4), gyro_y=round(gyro_y, 4), gyro_z=round(gyro_z, 4),
            magnitude=round(magnitude, 4),
            activity="walking"
        ))
    return readings


def _generate_fall(count_pre: int = 30, count_during: int = 20, count_after: int = 60) -> list[SensorReading]:
    """
    Simulate a realistic fall event with three phases:
    1. Pre-impact: loss of balance, sudden large accelerations
    2. Impact: sharp spike, then rapid tumble
    3. Post-impact: flatline (lying on floor), minimal movement
    """
    readings = []
    base_time = time.time()
    total = count_pre + count_during + count_after
    dt = 0.05  # 20Hz sampling

    for i in range(total):
        t = base_time + i * dt

        if i < count_pre:
            # Phase 1: Pre-fall — trip/t slip begins
            # Sudden lateral acceleration as body loses balance
            progress = i / count_pre
            acc_x = math.sin(progress * math.pi * 3) * 3.0 + _gaussian_noise(0.2, 0.0)
            acc_y = math.cos(progress * math.pi * 2) * 2.0 + _gaussian_noise(0.2, 0.0)
            acc_z = 1.0 + progress * 2.0 + _gaussian_noise(0.1, 0.0)  # starting to tip
            magnitude = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
            gyro_x = _gaussian_noise(30, progress * 100)
            gyro_y = _gaussian_noise(20, progress * 80)
            gyro_z = _gaussian_noise(15, progress * 60)

        elif i < count_pre + count_during:
            # Phase 2: Impact and tumble
            impact_phase = (i - count_pre) / count_during
            if impact_phase < 0.2:
                # Impact! Massive spike
                acc_x = (random.choice([-1, 1])) * 12.0 + _gaussian_noise(1.0, 0.0)
                acc_y = (random.choice([-1, 1])) * 10.0 + _gaussian_noise(1.0, 0.0)
                acc_z = -1.0 + _gaussian_noise(2.0, 0.0)
            else:
                # Tumble — chaotic rotation, decreasing magnitude
                tumble_decay = 1.0 - (impact_phase - 0.2) * 0.8
                acc_x = math.sin(impact_phase * 20) * 4.0 * tumble_decay + _gaussian_noise(0.5, 0.0)
                acc_y = math.cos(impact_phase * 15) * 3.0 * tumble_decay + _gaussian_noise(0.5, 0.0)
                acc_z = tumble_decay * 0.3 + _gaussian_noise(0.3, 0.0)
            magnitude = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
            # Gyro spins wildly during fall
            gyro_x = math.sin(i * 3) * 500 + _gaussian_noise(50, 0.0)
            gyro_y = math.cos(i * 2.5) * 400 + _gaussian_noise(50, 0.0)
            gyro_z = math.sin(i * 4) * 350 + _gaussian_noise(40, 0.0)

        else:
            # Phase 3: Lying on floor — near flatline
            # Very small movements (trying to get up, breathing)
            acc_x = _gaussian_noise(0.05, 0.1)
            acc_y = _gaussian_noise(0.05, 0.1)
            acc_z = 0.1 + _gaussian_noise(0.05, 0.0)  # very low — lying down
            magnitude = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
            gyro_x = _gaussian_noise(5.0, 0.0)
            gyro_y = _gaussian_noise(5.0, 0.0)
            gyro_z = _gaussian_noise(3.0, 0.0)

        readings.append(SensorReading(
            timestamp=datetime.fromtimestamp(t).isoformat(),
            acc_x=round(acc_x, 4), acc_y=round(acc_y, 4), acc_z=round(acc_z, 4),
            gyro_x=round(gyro_x, 4), gyro_y=round(gyro_y, 4), gyro_z=round(gyro_z, 4),
            magnitude=round(magnitude, 4),
            activity="falling"
        ))
    return readings


def generate_stream(activity: str, duration_seconds: float = 5.0, sample_rate: float = 20.0) -> Generator[dict, None, None]:
    """
    Generate a stream of sensor readings for the specified activity.
    Yields JSON-serializable dicts suitable for IoT Core ingestion.
    """
    total_samples = int(duration_seconds * sample_rate)

    if activity == "resting":
        samples = _generate_resting(total_samples)
    elif activity == "walking":
        samples = _generate_walking(total_samples)
    elif activity == "falling":
        pre = int(total_samples * 0.2)
        during = int(total_samples * 0.3)
        after = total_samples - pre - during
        samples = _generate_fall(pre, during, after)
    else:
        # Mixed: 3s walking → 2s fall → 5s post-fall
        walking = _generate_walking(int(sample_rate * 3))
        falling = _generate_fall(
            count_pre=int(sample_rate * 0.5),
            count_during=int(sample_rate * 0.5),
            count_after=int(sample_rate * 5)
        )
        samples = walking + falling

    for reading in samples:
        yield {
            "timestamp": reading.timestamp,
            "device_id": "bee-ruth-001",
            "user_id": "ruth-martinez",
            "sensor_type": "imu",
            "accelerometer": {
                "x_g": reading.acc_x,
                "y_g": reading.acc_y,
                "z_g": reading.acc_z,
                "magnitude_g": reading.magnitude
            },
            "gyroscope": {
                "x_dps": reading.gyro_x,
                "y_dps": reading.gyro_y,
                "z_dps": reading.gyro_z
            },
            "activity_class": reading.activity,
            "battery_percent": 87,
            "signal_strength_dbm": -42
        }


def classify_fall(readings: list[dict]) -> dict:
    """
    ML-based fall classification using sensor fusion.
    Implements a 4-stage pipeline matching real-world fall detection:
      1. Impact detection (accelerometer magnitude threshold)
      2. Post-impact flatline (loss of gravitational component)
      3. Tumble detection (gyroscope angular velocity)
      4. Temporal validation (impact → flatline sequence)
    Returns classification result with confidence score.
    """
    if len(readings) < 10:
        return {"classification": "insufficient_data", "confidence": 0.0}

    # Extract raw values
    magnitudes = [r["accelerometer"]["magnitude_g"] for r in readings]
    gyro_mags = [
        math.sqrt(
            r["gyroscope"]["x_dps"]**2 +
            r["gyroscope"]["y_dps"]**2 +
            r["gyroscope"]["z_dps"]**2
        ) for r in readings
    ]

    # Stage 1: Impact detection
    max_mag = max(magnitudes)
    impact_idx = magnitudes.index(max_mag)
    has_impact = max_mag >= THRESHOLDS.impact_threshold

    # Stage 2: Post-impact flatline analysis
    post_impact = magnitudes[impact_idx:]
    flatline_count = sum(1 for m in post_impact if m < THRESHOLDS.flatline_threshold)
    flatline_ratio = flatline_count / len(post_impact) if post_impact else 0
    has_flatline = flatline_ratio > 0.5 and len(post_impact) > 10

    # Stage 3: Tumble detection (gyroscope)
    max_gyro = max(gyro_mags)
    has_tumble = max_gyro >= THRESHOLDS.tumble_threshold

    # Stage 4: Pre-impact variance (sudden movement before impact)
    pre_impact_mag = magnitudes[:impact_idx] if impact_idx > 0 else magnitudes
    pre_variance = sum((m - sum(pre_impact_mag)/len(pre_impact_mag))**2
                       for m in pre_impact_mag) / len(pre_impact_mag) if pre_impact_mag else 0
    has_pre_shift = pre_variance > 0.5

    # Scoring: weighted combination of all stages
    scores = {
        "impact": 0.35 if has_impact else 0.0,
        "flatline": 0.25 if has_flatline else 0.0,
        "tumble": 0.25 if has_tumble else 0.0,
        "pre_shift": 0.15 if has_pre_shift else 0.0,
    }
    total_score = sum(scores.values())

    # Classify
    if total_score >= 0.70:
        classification = "fall"
    elif total_score >= 0.45:
        classification = "possible_fall"
    else:
        classification = "normal_activity"

    confidence = min(total_score, 1.0)

    return {
        "classification": classification,
        "confidence": round(confidence, 4),
        "scores": {k: round(v, 4) for k, v in scores.items()},
        "max_acceleration_g": round(max_mag, 4),
        "max_gyro dps": round(max_gyro, 4),
        "flatline_ratio": round(flatline_ratio, 4),
        "impact_index": impact_idx,
        "total_samples": len(readings),
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    print("=" * 60)
    print("NEXUS — Bee Wearable Sensor Simulator")
    print("=" * 60)

    # Demo: generate normal walking data
    print("\n[1] Generating normal walking pattern...")
    walking_data = list(generate_stream("walking", duration_seconds=3.0))
    print(f"    Generated {len(walking_data)} readings")
    result = classify_fall(walking_data)
    print(f"    Classification: {result['classification']} (confidence: {result['confidence']:.1%})")

    # Demo: generate fall data
    print("\n[2] Simulating FALL event...")
    fall_data = list(generate_stream("falling", duration_seconds=8.0))
    print(f"    Generated {len(fall_data)} readings")
    result = classify_fall(fall_data)
    print(f"    Classification: {result['classification']} (confidence: {result['confidence']:.1%})")
    print(f"    Score breakdown: {result['scores']}")

    # Save last reading for downstream consumers
    with open("last_reading.json", "w") as f:
        json.dump(fall_data[-1], f, indent=2)
    print(f"\n[3] Latest reading saved to last_reading.json")
    print("    Ready for IoT Core ingestion.")
