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

/**
 * Storyworthy-inspired prompts — blended with Groot's natural voice.
 *
 * Based on Matthew Dicks' "Homework for Life" practice:
 * - Every day has a five-second moment when something shifts
 * - Small moments > dramatic events
 * - Transformation is what makes a moment storyworthy
 * - The goal is to build a storytelling lens over time
 */
const DEFAULT_PROMPTS = [
  // Homework for Life — direct
  "What's one moment from today you'd actually tell someone about?",
  "If you had to pick one scene from today — just one — what would it be?",
  // Five-second moment probes
  "Was there a moment today where something clicked — or shifted?",
  "Did you see anything differently today than you did yesterday?",
  // Small > Big
  "Any small thing happen today that felt surprisingly meaningful?",
  "What's one tiny detail from today you don't want to forget?",
  // Transformation
  "Did anything change how you see something — even a little?",
  "What caught you off guard today?",
  // Softer rotations
  "What stuck with you today?",
  "Anything unexpected happen?",
  "If today had a title, what would it be?",
  "What's the one thing from today worth remembering?",
  // First/Last/Best/Worst (periodic)
  "Random one — what's the best conversation you had today?",
  "What was the last thing that made you laugh today?",
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
Your goal is to surface the STORYWORTHY moment of the day — the one scene, shift, or five-second moment that made today different from any other day.
Prefer questions about small meaningful moments over big events. Ask about what shifted, surprised, or stuck with them.
Output only the question, nothing else.
Use WhatsApp formatting (_italic_ for emphasis if needed).`,
        [
          {
            role: "user",
            content: `Today's conversations:\n${context}\n\nGenerate a personalized reflection question:`,
          },
        ],
        { maxTokens: 16384, temperature: 0.9 },
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
