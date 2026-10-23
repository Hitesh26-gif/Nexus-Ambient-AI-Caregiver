"""
Nexus Voice Assistant Lambda — Deployed Function
=================================================
Entry point for deployed Lambda. Delegates to aws-backend context_understanding.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "aws-backend"))

from aws_backend.lambda_functions.context_understanding import lambda_handler, generate_response, build_system_prompt

__all__ = ["lambda_handler"]
