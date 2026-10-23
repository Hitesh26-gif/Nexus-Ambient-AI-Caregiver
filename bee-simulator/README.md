"""
Bee Wearable Simulator — README
================================

The Bee wearable is a small clip-on IoT device worn by elderly users.
This simulator generates realistic IMU (Inertial Measurement Unit) data
that mirrors what a real Bosch BMI160 or similar sensor would produce.

## Sensor Specifications
- Accelerometer: ±16g range, 20Hz sampling
- Gyroscope: ±2000°/s range, 20Hz sampling
- Form factor: Clip-on blouse/waistband
- Battery: 7-day lifespan, NFC charging

## Activity Patterns Simulated

### Resting
- Gravity vector: ~1.0g on Z-axis (device orientation dependent)
- Micro-oscillations from breathing (~0.03g amplitude, 0.2Hz)
- Gyro near-zero (<5°/s) — only hand tremor noise

### Walking
- Periodic oscillation at ~1.2Hz (slow elderly gait)
- Vertical bobbing: ±0.3g on Z-axis
- Lateral sway: ±0.4g on X-axis
- Gyro rotation correlates with step phase

### Falling (THE KEY PATTERN)
Three-phase signature that distinguishes falls from other activities:
1. **Pre-impact** (0.5s): Sudden lateral acceleration as balance is lost
2. **Impact** (0.1s): Sharp spike >8g from ground strike
3. **Post-impact** (3s+): Magnitude drops to near-zero (flatline) —
   the body is lying still on the floor

## Running the Simulator

```bash
# Full day simulation (with timing)
python simulator.py

# Fast demo mode (no delays)
python simulator.py --fast

# Just the sensor generator (for use by other components)
python sensor_generator.py
```

## Integration Points
- Output JSON documents conform to AWS IoT Core message format
- Each reading includes: device_id, user_id, battery_percent, signal_strength_dbm
- Fall classifications are published as events to SQS / IoT Core
- Last reading saved to `last_reading.json` for dashboard consumption

## Fall Detection Algorithm
See `sensor_generator.py:classify_fall()` for the 4-stage pipeline:
1. Impact detection — accelerometer magnitude > 8g threshold
2. Flatline detection — post-impact magnitude < 0.5g for >50% of window
3. Tumble detection — gyroscope magnitude > 300°/s during event
4. Temporal validation — proper impact→flatline sequence

Scoring: impact(35%) + flatline(25%) + tumble(25%) + pre-shift(15%)
Classification: ≥70% = fall, ≥45% = possible_fall, <45% = normal
