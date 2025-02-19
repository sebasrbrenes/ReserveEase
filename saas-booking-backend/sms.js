import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Debug: Check if environment variables are loaded
console.log("Account SID:", accountSid);
console.log("Auth Token:", authToken);

const client = twilio(accountSid, authToken);

async function createMessage() {
  try {
    const message = await client.messages.create({
      body: "This is a scheduled message",
      messagingServiceSid: "MGb7e208645de27765ad269327c86e1aea", // Twilio Messages Services ID
      scheduleType: "fixed",
      sendAt: new Date("2025-01-31 18:00:00"), // Scheduled time
      to: "+50662305506", // Recipient phone number
    });

    console.log("Message SID:", message.sid);
    console.log("Message Body:", message.body);
  } catch (error) {
    console.error("Error creating message:", error);
  }
}

createMessage();
