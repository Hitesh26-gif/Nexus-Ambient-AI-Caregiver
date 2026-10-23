"""
Nexus Fall Detection Lambda — Deployed Function
===============================================
Entry point for deployed Lambda. Delegates to aws-backend fall_handler.
Included here for deployment packaging.
"""

import sys
import os

# Add aws-backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aws-backend"))

from aws_backend.lambda_functions.fall_handler import lambda_handler, classify_fall, store_vitals, send_to_sqs

__all__ = ["lambda_handler"]
