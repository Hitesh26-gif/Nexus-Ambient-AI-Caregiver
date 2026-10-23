"""
Nexus Care Report Lambda — Deployed Function
=============================================
Entry point for deployed Lambda. Delegates to aws-backend care_reporter.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aws-backend"))

from aws_backend.lambda_functions.care_reporter import lambda_handler, generate_daily_report, send_report

__all__ = ["lambda_handler"]
