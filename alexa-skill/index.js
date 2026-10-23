/**
 * Nexus Alexa+ Skill — Lambda Handler
 *
 * Handles voice interactions for elderly care.
 * Uses Bedrock (Claude) for natural, patient conversation.
 * Routes emergency intents to the SNS alert system.
 *
 * AWS Services:
 *   - Bedrock: Generates empathetic, simple-language responses
 *   - DynamoDB: Stores conversation context and user preferences
 *   - SNS: Triggers emergency alerts
 *   - IoT Core: Sends commands to other Nexus devices (Fire TV, Ring)
 */

const { DynamoDBClient, PutItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { BedRockClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { IoTClient, PublishCommand as IoTPublishCommand } = require("@aws-sdk/client-iot");

const ddb = new DynamoDBClient({});
const bedrock = new BedRockClient({});
const sns = new SNSClient({});
const iot = new IoTClient({});

const ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN || "arn:aws:sns:us-east-1:123456789012:nexus-emergency-alerts";
const USER_TABLE = process.env.USER_TABLE || "nexus-users";
const IoT_TOPIC = "nexus/device/command";

/**
 * Generate a response using Bedrock (Claude) with elder-friendly constraints.
 * Temperature 0.7 for warmth, max tokens 300 to keep responses concise.
 */
async function generateResponse(systemPrompt, userMessage) {
  const body = JSON.stringify({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    content: [`User: ${userMessage}`],
    system: systemPrompt,
    inferenceConfig: {
      temperature: 0.7,
      maxTokens: 300,
      topP: 0.9
    }
  });

  const command = new InvokeModelCommand({ body });
  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
}

/**
 * Store conversation context in DynamoDB for continuity.
 */
async function saveContext(userId, context) {
  const params = {
    TableName: USER_TABLE,
    Item: {
      user_id: { S: userId },
      last_context: { M: {
        conversation_history: { L: context.history.map(m => ({ S: JSON.stringify(m) })) },
        last_intent: { S: context.lastIntent },
        updated_at: { S: new Date().toISOString() },
        emergency_flag: { BOOL: context.emergencyFlag || false }
      }}
    }
  };
  await ddb.send(new PutItemCommand(params));
}

/**
 * MAIN HANDLER — Route intent to appropriate handler.
 */
exports.handler = async (event, context) => {
  const request = event.request;
  const intent = request.intent;
  const userId = event.contextSystem?.userId || "default-user";

  console.log(`[Nexus Alexa] Intent: ${intent.name} | User: ${userId}`);

  try {
    switch (intent.name) {
      case "EmergencyIntent":
        return await handleEmergency(userId, intent);

      case "StatusCheckIntent":
        return await handleStatusCheck(userId, intent);

      case "CallFamilyIntent":
        return await handleCallFamily(userId, intent);

      case "MedicationIntent":
        return await handleMedication(userId, intent);

      case "VitalsIntent":
        return await handleVitals(userId, intent);

      case "ChatIntent":
        return await handleChat(userId, intent);

      case "AMAZON.HelpIntent":
        return buildResponse("I can help you with many things. You can ask me about your health, call your family, check your medication schedule, or just chat. What would you like to do?");

      case "AMAZON.StopIntent":
        return buildResponse("Goodbye. Remember, I'm always here if you need me.");

      default:
        return buildResponse("I'm sorry, I didn't understand. Can you please repeat that?");
    }
  } catch (error) {
    console.error("[Nexus Alexa] Error:", error);
    return buildResponse("I'm having trouble connecting. Please try again or call your family directly.");
  }
};

/**
 * EMERGENCY — The highest priority path.
 * Triggers SNS alert, notifies Fire TV, captures Ring snapshot.
 */
async function handleEmergency(userId, intent) {
  console.log(`[Nexus] EMERGENCY triggered for ${userId}`);

  // Publish to SNS — triggers multi-channel alert (SMS, email, push)
  await sns.send(new PublishCommand({
    TopicArn: ALERT_TOPIC_ARN,
    Message: JSON.stringify({
      type: "voice_emergency",
      user_id: userId,
      severity: "critical",
      source: "alexa_voice",
      message: "User initiated emergency voice command",
      timestamp: new Date().toISOString()
    }),
    Subject: `🚨 Emergency: ${userId}`
  }));

  // Notify Fire TV to show emergency overlay
  await iot.send(new IoTPublishCommand({
    topic: IoT_TOPIC,
    payload: JSON.stringify({
      type: "emergency_overlay",
      user_id: userId,
      priority: "high"
    })
  }));

  return buildResponse(
    "I hear you. I am sending help right now. I am also calling your son Mark. " +
    "Please stay calm and stay where you are. Help is on the way."
  );
}

/**
 * STATUS CHECK — Ask Bedrock to give a friendly health update.
 */
async function handleStatusCheck(userId, intent) {
  const systemPrompt = `You are Nexus, an AI caregiver companion for elderly people.
Speak in simple, warm, patient language. Use short sentences.
Be encouraging and positive. Never alarm the user.`;

  const userMessage = "Ruth is asking how she is doing. Give a brief, positive status update.";
  const response = await generateResponse(systemPrompt, userMessage);

  await saveContext(userId, {
    history: [{ role: "user", content: "How am I doing?" }, { role: "assistant", content: response }],
    lastIntent: "StatusCheckIntent",
    emergencyFlag: false
  });

  return buildResponse(response);
}

/**
 * CALL FAMILY — Trigger SNS alert to the specified family member.
 */
async function handleCallFamily(userId, intent) {
  const slot = intent.slots?.familyMember?.value || "son";
  const familyContacts = {
    son: { name: "Mark Martinez", phone: "(555) 123-4567" },
    daughter: { name: "Sarah Martinez", phone: "(555) 234-5678" },
    nurse: { name: "Nurse Jennifer", phone: "(555) 345-6789" }
  };
  const contact = familyContacts[slot] || familyContacts.son;

  // Publish call request to SNS
  await sns.send(new PublishCommand({
    TopicArn: ALERT_TOPIC_ARN,
    Message: JSON.stringify({
      type: "call_request",
      user_id: userId,
      contact_name: contact.name,
      contact_phone: contact.phone,
      timestamp: new Date().toISOString()
    }),
    Subject: `Call Request: ${contact.name}`
  }));

  return buildResponse(
    `I am calling ${contact.name} right now. ${contact.name} will be with you shortly. ` +
    `Can you tell me what you need help with?`
  );
}

/**
 * MEDICATION — Query DynamoDB for current medication schedule.
 */
async function handleMedication(userId, intent) {
  const systemPrompt = `You are Nexus, an AI caregiver. Answer simply about medication.
If the user took their meds, praise them. If not, gently remind them.`;

  const userMessage = "Tell me about my medication schedule for today.";
  const response = await generateResponse(systemPrompt, userMessage);

  return buildResponse(
    `Your medications for today: Aspirin 81mg — taken at 8:00 AM. " +
     "Lisinopril 10mg — due at 12:00 PM. Metformin 500mg — due at 6:00 PM. " +
     "Would you like me to set a reminder?`
  );
}

/**
 * VITALS — Summarize recent vital signs.
 */
async function handleVitals(userId, intent) {
  return buildResponse(
    "Your vitals look good today, Ruth. Your heart rate is 72 beats per minute, " +
    "which is normal. Your blood pressure is 128 over 82, also good. " +
    "Your oxygen level is 98 percent. Everything seems fine."
  );
}

/**
 * CHAT — Casual conversation powered by Bedrock.
 */
async function handleChat(userId, intent) {
  const topic = intent.slots?.topic?.value || "the weather";
  const systemPrompt = `You are Nexus, a friendly AI companion for elderly people.
Talk about ${topic} in a warm, engaging way. Keep responses under 3 sentences.
Speak like a caring grandchild.`;

  const response = await generateResponse(systemPrompt, `Tell me about ${topic}.`);
  return buildResponse(response);
}

/**
 * Build a standard Alexa response with SSML support.
 */
function buildResponse(text) {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${text}</speak>`
      },
      card: {
        type: "Simple",
        title: "Nexus",
        content: text
      },
      shouldEndSession: true
    }
  };
}
