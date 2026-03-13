import { getState } from '../state.js';

function getBaseRules() {
  return `You are FormMate, an expert AI form assistant. You help the user fill out forms intelligently.
Strict Rules:
- Never fabricate personal information that is not explicitly provided in the User Profile or Vault Data.
- If asked for specific personal data (like ID numbers) that is missing, return an empty string or placeholder.
- Maintain formatting constraints requested by the user.`;
}

function getToneInstructions(personality) {
  const tones = {
    professional: "Be formal, concise, and business-appropriate. Use confident, academic vocabulary if necessary.",
    friendly: "Be warm, approachable, empathetic, and use a conversational, highly engaging tone.",
    concise: "Use as few words as possible. Avoid filler words. Get straight to the point.",
    creative: "Be engaging, expressive, use metaphors, and think outside the box.",
    formal: "Be highly structured, polite, and respectful. Avoid contractions and slang."
  };
  return `\nWriting Tone: ${personality || 'professional'}. ${tones[personality] || tones.professional}`;
}

function getFormattingInstructions(settings) {
  let instructions = '';
  if (settings?.formatting?.responseLength === 'short') instructions += "- Keep all generated text very brief.\n";
  if (settings?.formatting?.responseLength === 'long') instructions += "- Provide detailed, expansive answers.\n";
  if (settings?.formatting?.preferBullets) instructions += "- Prefer bullet points for long text answers where lists make sense.\n";
  return instructions ? `\nFormatting Preferences:\n${instructions}` : '';
}

function getContextInjection(userProfile, vault) {
  let context = `\n--- Context ---\nUser Profile:\n`;
  context += `- Name: ${userProfile?.name || 'Unknown'}\n`;
  context += `- Email: ${userProfile?.email || 'Unknown'}\n`;
  context += `- Occupation: ${userProfile?.occupation || 'Unknown'}\n`;
  context += `- Experience: ${userProfile?.experience || 'Unknown'}\n`;
  if (userProfile?.bio) context += `- Bio/Notes: ${userProfile.bio}\n`;

  const vaultKeys = Object.keys(vault || {});
  if (vaultKeys.length > 0) {
    context += `\nStored Vault Data (use this if relevant):\n`;
    for (const [k, v] of Object.entries(vault)) {
      context += `- ${k}: ${v}\n`;
    }
  }
  return context;
}

export function buildSystemPrompt(taskType, additionalContext = '') {
  const { userProfile, vault, settings, personality } = getState();

  let prompt = getBaseRules();
  prompt += getToneInstructions(personality || settings?.ai?.defaultPersonality);
  prompt += getFormattingInstructions(settings);
  prompt += getContextInjection(userProfile, vault);

  prompt += `\n--- Task Instructions ---\n`;

  if (taskType === 'answer_generation') {
    prompt += `You MUST return valid JSON ONLY. It must be an object where keys are question IDs (strings, 1-indexed) and values are objects with "answer" (string) and "confidence" (number between 0.0 and 1.0).\n`;
    prompt += `For radio/dropdown, answer MUST exactly match one option.\n`;
    prompt += `For checkboxes, answer MUST be a comma-separated list of exact options.\n`;
    prompt += `If you are absolutely certain based on the User Profile or Vault Data, set confidence to 0.95 or higher.\n`;
    prompt += `If generating a generic but appropriate answer, set confidence between 0.70 and 0.85.\n`;
  } else if (taskType === 'regeneration') {
    prompt += `Regenerate the answer for the provided field. Return ONLY the new answer text (no quotes, no JSON, no explanations).\n`;
  } else if (taskType === 'quick_edit') {
    prompt += `Apply the requested quick edit (e.g. shorten, professionalize) to the provided answer. Return ONLY the edited answer text (no quotes, no JSON, no explanations).\n`;
  } else if (taskType === 'copilot_chat') {
    prompt += `You are FormMate's chat copilot. You assist the user with filling out the form.\nBe helpful, provide concrete suggestions, and answer questions clearly.`;
  }

  if (additionalContext) {
    prompt += `\n${additionalContext}\n`;
  }

  return prompt;
}
