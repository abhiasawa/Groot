import { getRecentMessages } from "@/lib/memory/short-term";
import { getLLMProvider } from "@/lib/providers/llm";
import { logger } from "@/lib/logger";

/**
 * Journal prompt generator — creates context-aware evening reflection prompts.
 *
 * Rules:
 * - Never ask the same question two nights in a row
 * - Use context from the day's conversations when available
 * - Keep prompts warm and inviting, never clinical
 */

const DEFAULT_PROMPTS = [
  "What was the best part of your day?",
  "What's one thing you learned today?",
  "If you could change one thing about today, what would it be?",
  "What are you grateful for today?",
  "What's something you're looking forward to tomorrow?",
  "How are you feeling right now, in one word?",
  "What made you smile today?",
  "What challenged you today, and how did you handle it?",
  "What's one thing you did today that you're proud of?",
  "If you could describe your day in three words, what would they be?",
];

/**
 * Generate a context-aware reflection prompt for a user.
 */
export async function generateReflectionPrompt(
  userId: string,
  userName: string | null,
): Promise<string> {
  const name = userName ?? "there";

  // Try to generate a contextual prompt using the day's messages
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const recentMessages = await getRecentMessages(userId, 10);
    const todayMessages = recentMessages.filter(
      (m) => new Date(m.created_at) >= todayStart && m.direction === "inbound",
    );

    if (todayMessages.length >= 3) {
      // Enough context — use AI to generate a personalized prompt
      const provider = getLLMProvider();
      const context = todayMessages
        .map((m) => m.content)
        .filter(Boolean)
        .join("\n");

      const response = await provider.generateResponse(
        `Generate ONE short evening reflection question for ${name}.
Use their day's context to make it personal. Keep it warm and inviting.
Output only the question, nothing else.
Use WhatsApp formatting (_italic_ for emphasis if needed).`,
        [
          {
            role: "user",
            content: `Today's conversations:\n${context}\n\nGenerate a personalized reflection question:`,
          },
        ],
        { maxTokens: 100, temperature: 0.9 },
      );

      return `Hey ${name}, time for a quick reflection 🌙\n\n${response.text}`;
    }
  } catch (error) {
    logger.warn({ error, userId }, "Failed to generate contextual prompt, using default");
  }

  // Fallback: use a random default prompt
  const prompt = DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)]!;
  return `Hey ${name}, time for a quick reflection 🌙\n\n${prompt}`;
}
