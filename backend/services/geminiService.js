import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash'; // Fallback model if 3.8 is busy

const BOOKLEAF_KNOWLEDGE_BASE = `
COMPANY OVERVIEW: BookLeaf Publishing operates in India and the US. Packages: Standard Free and Bestseller Breakthrough.
ROYALTY POLICY: 80% net profit to author, 20% to BookLeaf. Net profit = MRP minus printing, commission, shipping. Paid within 45 days of quarter end. Minimum ₹1,000 threshold.
ISBN POLICY: Unique ISBNs assigned by BookLeaf. Errors are high-priority.
PRINTING & QUALITY: Standard turnaround 5-7 business days. Quality issues qualify for free reprint after photo verification.
DISTRIBUTION: Listed on Amazon India, Flipkart, US, UK, BookLeaf Store. Stock sync issues resolved within 24-48 hours.
PRODUCTION STAGES: Manuscript Received -> Editing -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.
`;

// Helper to handle requests with automatic fallback on 503 / high demand
async function callGeminiWithFallback(prompt) {
  try {
    const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
    return response.text.trim();
  } catch (error) {
    console.warn(`Primary model (${MODEL_NAME}) busy or failed, trying fallback model...`);
    try {
      const fallbackResponse = await ai.models.generateContent({ model: FALLBACK_MODEL, contents: prompt });
      return fallbackResponse.text.trim();
    } catch (fallbackError) {
      throw fallbackError; // Throw to trigger outer catch block if both fail
    }
  }
}

export async function classifyAndPrioritizeTicket(subject, description) {
  try {
    const prompt = `Analyze this support ticket and return a JSON object with fields "category" and "priority".
Categories: ["Royalty & Payments", "ISBN & Metadata Issues", "Printing & Quality", "Distribution & Availability", "Book Status & Production Updates", "General Inquiry"]
Priorities: ["Critical", "High", "Medium", "Low"]
Subject: "${subject}"
Description: "${description}"
Return ONLY valid JSON format.`;

    const textResponse = await callGeminiWithFallback(prompt);
    return JSON.parse(textResponse.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error('Gemini Classification Error:', error.message);
    return { category: 'General Inquiry', priority: 'Medium' };
  }
}

export async function generateDraftResponse(ticket, author, book) {
  try {
    const prompt = `You are a support representative at BookLeaf. Draft a response using these policies:
${BOOKLEAF_KNOWLEDGE_BASE}
Author: ${author?.name} | Book: ${book?.title} | Status: ${book?.status}
- Ticket: [${ticket.category}] ${ticket.subject}
${ticket.description}`;

    return await callGeminiWithFallback(prompt);
  } catch (error) {
    console.error('Gemini Draft Error:', error.message);
    return `Hello ${author?.name || 'Valued Author'}, thank you for reaching out regarding "${book?.title || 'your book'}". We have received your query about "${ticket?.subject}" and our support team is actively reviewing it. We will update you shortly with a resolution.`;
  }
}