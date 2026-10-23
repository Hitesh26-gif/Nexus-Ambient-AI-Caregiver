"""
Nexus Medication Check Lambda — Deployed Function
==================================================
Entry point for deployed Lambda. Delegates to aws-backend medication_tracker.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aws-backend"))

from aws_backend.lambda_functions.medication_tracker import lambda_handler, detect_pill_bottles, calculate_weekly_compliance

__all__ = ["lambda_handler"]
