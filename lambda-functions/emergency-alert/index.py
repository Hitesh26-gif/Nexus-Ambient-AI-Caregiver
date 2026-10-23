"""
Nexus Emergency Alert Lambda — Deployed Function
=================================================
Entry point for deployed Lambda. Delegates to aws-backend alert_router.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aws-backend"))

from aws_backend.lambda_functions.alert_router import lambda_handler, route_alert, build_sms_message, build_email_html

__all__ = ["lambda_handler"]
