"""
Context Understanding Lambda — Bedrock-Powered Conversation Analysis
====================================================================
Uses Amazon Bedrock (Claude) to:
  1. Understand natural language queries from elderly users
  2. Generate empathetic, age-appropriate responses
  3. Extract intent and entities from voice transcripts
  4. Provide contextual awareness (time of day, recent events, vitals)

AWS Services Used:
  - Bedrock: Claude for natural conversation generation
  - DynamoDB: Conversation history and context store
  - SNS: Relay responses to Alexa/other endpoints
"""

import json
import os
import boto3
from datetime import datetime
from typing import Dict, List, Optional

# AWS clients
bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-east-1"))

TABLE_NAME = os.environ.get("TABLE_NAME", "nexus-conversations")
MODEL_ID = os.environ.get("MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")


def get_conversation_history(user_id: str, limit: int = 10) -> List[Dict]:
    """Retrieve recent conversation history from DynamoDB."""
    table = dynamodb.Table(TABLE_NAME)
    response = table.query(
        IndexName="user-timestamp-index",
        KeyConditionExpression="user_id = :uid",
        ExpressionAttributeValues={":uid": user_id},
        ScanIndexForward=False,
        Limit=limit
    )
    return response.get("Items", [])


def build_system_prompt(user_context: Dict) -> str:
    """
    Build a context-aware system prompt for Bedrock.
    Includes user profile, recent events, and communication guidelines.
    """
    vitals = user_context.get("vitals", {})
    recent_falls = user_context.get("recent_falls", 0)
    med_compliance = user_context.get("medication_compliance", 100)
    time_of_day = datetime.now().strftime("%I %p").lstrip("0")

    return f"""You are Nexus, an AI caregiver companion for elderly people. Your user is Ruth, a 78-year-old woman who lives alone.

RULES FOR COMMUNICATION:
- Speak in SIMPLE, CLEAR, SHORT sentences. No complex vocabulary.
- Be WARM, PATIENT, and ENCOURAGING. Always sound caring.
- Never use medical jargon. Explain things simply.
- If the user seems confused or distressed, stay calm and reassuring.
- Always end with a gentle question to keep them engaged.

CURRENT CONTEXT:
- Time: {time_of_day}
- Heart rate: {vitals.get('heart_rate', 'N/A')} bpm
- Blood pressure: {vitals.get('blood_pressure', 'N/A')} mmHg
- Oxygen: {vitals.get('spo2', 'N/A')}%
- Recent falls: {recent_falls}
- Medication compliance this week: {med_compliance}%

If the user asks about their health, give a positive, encouraging update.
If they seem upset, validate their feelings and offer support.
Never alarm them — frame everything positively."""


def get_user_context(user_id: str) -> Dict:
    """Fetch current context for the user from DynamoDB."""
    # This would query multiple tables in production
    return {
        "vitals": {
            "heart_rate": 72,
            "blood_pressure": "128/82",
            "spo2": "98%"
        },
        "recent_falls": 0,
        "medication_compliance": 98,
        "last_event": "normal",
        "caregiver": {"name": "Mark Martinez", "phone": "(555) 123-4567"},
    }


def generate_response(user_message: str, user_id: str) -> Dict:
    """
    Generate a Bedrock-powered response to the user's message.
    Includes conversation history for context.
    """
    history = get_conversation_history(user_id)
    context = get_user_context(user_id)
    system_prompt = build_system_prompt(context)

    # Format conversation history for the model
    conversation_messages = []
    for msg in history[-6:]:  # Last 6 messages
        conversation_messages.append({
            "role": msg.get("role", "user"),
            "content": [{"text": msg.get("content", "")}]
        })
    conversation_messages.append({"role": "user", "content": [{"text": user_message}]})

    # Call Bedrock
    try:
        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": system_prompt}],
            messages=conversation_messages,
            inferenceConfig={"temperature": 0.7, "maxTokens": 300}
        )
        assistant_message = response["output"]["message"]["content"][0]["text"]
    except Exception as e:
        # Fallback response if Bedrock is unavailable
        assistant_message = f"I hear you, Ruth. Let me check on that for you. Is there anything else I can help with?"
        print(f"[Bedrock] Error: {e}")

    # Store in DynamoDB
    table = dynamodb.Table(TABLE_NAME)
    table.put_item(Item={
        "message_id": f"msg-{datetime.utcnow().timestamp()}",
        "user_id": user_id,
        "role": "user",
        "content": user_message,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    table.put_item(Item={
        "message_id": f"msg-{datetime.utcnow().timestamp()}-assistant",
        "user_id": user_id,
        "role": "assistant",
        "content": assistant_message,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

    # Extract intent for routing
    intent = _extract_intent(user_message, assistant_message)

    return {
        "response": assistant_message,
        "intent": intent,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


def _extract_intent(message: str, response: str) -> Dict:
    """Simple intent extraction from message and response."""
    intents = {
        "emergency": any(kw in message.lower() for kw in ["help", "fell", "emergency", "not okay"]),
        "status_check": any(kw in message.lower() for kw in ["how am i", "am i okay", "status", "how do i look"]),
        "medication": any(kw in message.lower() for kw in ["medication", "pill", "medicine", "drug"]),
        "call_family": any(kw in message.lower() for kw in ["call", "phone", "reach", "contact"]),
        "chitchat": True,  # Default
    }

    # Override based on response clues
    if "call" in response.lower() or "contact" in response.lower():
        intents["call_family"] = True
    if "medicine" in response.lower() or "pill" in response.lower():
        intents["medication"] = True

    return {
        "primary_intent": max(intents, key=intents.get),
        "all_intents": intents,
        "requires_escalation": intents.get("emergency", False)
    }


def lambda_handler(event, context):
    """
    Main handler — processes natural language queries.
    Expects: {"user_id": "...", "message": "..."}
    """
    user_id = event.get("user_id", "default-user")
    message = event.get("message", "")

    if not message:
        return {"statusCode": 400, "error": "Missing message"}

    print(f"[ContextUnderstanding] {user_id}: {message}")

    result = generate_response(message, user_id)

    return {
        "statusCode": 200,
        "body": json.dumps(result)
    }


if __name__ == "__main__":
    print("=" * 60)
    print("  NEXUS — Context Understanding Lambda (Local Test)")
    print("=" * 60)

    test_messages = [
        "Am I okay?",
        "Call my son",
        "What time is my medication?",
        "I need help",
        "Tell me about the weather",
    ]

    for msg in test_messages:
        print(f"\nUser: {msg}")
        result = generate_response(msg, "ruth-martinez")
        print(f"Response: {result['response']}")
        print(f"Intent: {result['intent']['primary_intent']}")
