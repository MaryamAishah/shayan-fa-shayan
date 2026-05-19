import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";

export const suggestHabitMeta = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; reminder?: string; location?: string }) => {
    if (!input?.name || typeof input.name !== "string") throw new Error("name required");
    return {
      name: input.name.slice(0, 200),
      reminder: input.reminder?.slice(0, 400) ?? "",
      location: input.location?.slice(0, 200) ?? "",
    };
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { emoji: "🌱", motivation: "" };

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const model = gateway("google/gemini-3-flash-preview");

      const { experimental_output } = await generateText({
        model,
        output: Output.object({
          schema: z.object({
            emoji: z.string().min(1).max(8),
            motivation: z.string().min(10).max(220),
          }),
        }),
        prompt:
          `You are a warm Islamic habit coach. The user is building this habit:\n` +
          `Habit: "${data.name}"\n` +
          (data.location ? `Where: ${data.location}\n` : "") +
          (data.reminder ? `Their own note: ${data.reminder}\n` : "") +
          `\nReturn:\n` +
          `1. emoji — ONE single emoji that best represents this habit (no text, just the emoji character).\n` +
          `2. motivation — one warm, specific sentence (max 30 words) tailored to THIS habit that the user can read on weak days. ` +
          `Mention the habit briefly. You may reference Islamic concepts (Allah, Jannah, sincerity, niyyah, barakah) gently — but never fabricate a hadith or ayah. Avoid clichés like "you got this".`,
      });

      return {
        emoji: experimental_output.emoji,
        motivation: experimental_output.motivation,
      };
    } catch (e) {
      console.error("suggestHabitMeta failed", e);
      return { emoji: "🌱", motivation: "" };
    }
  });
