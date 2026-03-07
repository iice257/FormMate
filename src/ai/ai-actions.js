// ═══════════════════════════════════════════
// FormMate — AI Actions Layer
// ═══════════════════════════════════════════
//
// High-level AI functions that build context-aware
// prompts using user profile, vault, and settings.
// ═══════════════════════════════════════════

import { generate, parseJsonResponse } from './ai-service.js';
import { getState } from '../state.js';

// ─── Prompt Composer ─────────────────────────

function buildSystemPrompt(taskType, additionalContext = '') {
  const { userProfile, vault, settings, personality } = getState();

  // Base Rules
  let prompt = `You are FormMate, an expert AI form assistant. You help the user fill out forms intelligently.\n`;
  prompt += `Strict Rules:\n`;
  prompt += `- Never fabricate personal information that is not provided.\n`;
  prompt += `- If asked for specific personal data (like ID numbers) that is missing, return an empty string or placeholder.\n`;

  // Personality / Tone
  prompt += `- Writing Tone: ${personality || 'professional'}. `;
  if (personality === 'professional') prompt += `Be formal, concise, and business-appropriate.\n`;
  else if (personality === 'friendly') prompt += `Be warm, approachable, and use a conversational tone.\n`;
  else if (personality === 'concise') prompt += `Use as few words as possible. Use bullet points if applicable.\n`;
  else if (personality === 'creative') prompt += `Be engaging, expressive, and think outside the box.\n`;
  else prompt += `Be formal and structured.\n`;

  // Formatting
  if (settings?.formatting?.responseLength === 'short') prompt += `- Keep all generated text very brief.\n`;
  if (settings?.formatting?.preferBullets) prompt += `- Prefer bullet points for long text answers.\n`;

  // Context Injection
  prompt += `\n--- Context ---\n`;
  prompt += `User Profile:\n`;
  prompt += `- Name: ${userProfile?.name || 'Unknown'}\n`;
  prompt += `- Email: ${userProfile?.email || 'Unknown'}\n`;
  prompt += `- Occupation: ${userProfile?.occupation || 'Unknown'}\n`;
  prompt += `- Experience: ${userProfile?.experience || 'Unknown'}\n`;
  if (userProfile?.bio) prompt += `- Bio/Notes: ${userProfile.bio}\n`;

  const vaultKeys = Object.keys(vault || {});
  if (vaultKeys.length > 0) {
    prompt += `\nStored Vault Data (use this if relevant):\n`;
    for (const [k, v] of Object.entries(vault)) {
      prompt += `- ${k}: ${v}\n`;
    }
  }

  // Task specific instructions
  prompt += `\n--- Task Instructions ---\n`;
  if (taskType === 'answer_generation') {
    prompt += `You MUST return valid JSON ONLY. It must be an object where keys are question IDs (strings, 1-indexed) and values are objects with "answer" (string) and "confidence" (number between 0.0 and 1.0).\n`;
    prompt += `For radio/dropdown, answer MUST exactly match one option.\n`;
    prompt += `For checkboxes, answer MUST be a comma-separated list of exact options.\n`;
    prompt += `If you are absolutely certain based on the User Profile or Vault Data, set confidence to 0.95 or higher.\n`;
    prompt += `If generating a generic but appropriate answer, set confidence between 0.70 and 0.85.\n`;
  }

  if (additionalContext) {
    prompt += `\n${additionalContext}\n`;
  }

  return prompt;
}

// ─── Form Analysis (Field Categorization) ────

/**
 * Pre-analyze the form to categorize fields: autofillable, generatable, manual-only.
 */
export async function analyzeFormFields(formData) {
  // Logic to determine which fields can be auto-filled directly from vault vs AI generated
  const analysis = {};
  const { userProfile, vault, settings } = getState();

  formData.questions.forEach(q => {
    let category = 'generatable';
    let exactMatch = null;

    const lowerText = q.text.toLowerCase();

    // Direct matches from profile
    if (lowerText.includes('first name') || lowerText.includes('full name') || lowerText === 'name') {
      if (userProfile.name) { category = 'autofillable'; exactMatch = userProfile.name; }
    } else if (lowerText.includes('email')) {
      if (userProfile.email) { category = 'autofillable'; exactMatch = userProfile.email; }
    } else if (lowerText.includes('phone') || lowerText.includes('mobile')) {
      if (userProfile.phone) { category = 'autofillable'; exactMatch = userProfile.phone; }
    } else if (lowerText.includes('occupation') || lowerText.includes('job title')) {
      if (userProfile.occupation) { category = 'autofillable'; exactMatch = userProfile.occupation; }
    }

    // Direct matches from vault
    if (!exactMatch && vault) {
      for (const [key, val] of Object.entries(vault)) {
        if (lowerText.includes(key.toLowerCase())) {
          category = 'autofillable';
          exactMatch = val;
          break;
        }
      }
    }

    // Sensitive / manual fields
    if (lowerText.includes('password') || lowerText.includes('credit card') || lowerText.includes('ssn')) {
      category = 'manual_only';
    }

    // Only allow autofill if settings permit
    if (category === 'autofillable' && !settings?.personalization?.autoFillPersonal) {
      category = 'generatable';
      exactMatch = null;
    }

    analysis[q.id] = { category, exactMatch };
  });

  return analysis;
}

// ─── Answer Generation ───────────────────────

/**
 * Generate AI answers for all questions in a form.
 */
export async function generateAnswers(formData) {
  const { settings } = getState();
  const fieldAnalysis = await analyzeFormFields(formData);
  const answers = {};

  // First pass: apply autofillable fields immediately
  const questionsToGenerate = [];
  formData.questions.forEach((q, i) => {
    const analysis = fieldAnalysis[q.id];
    if (analysis.category === 'autofillable' && analysis.exactMatch) {
      answers[q.id] = { text: String(analysis.exactMatch), source: 'autofill', confidence: 1.0 };
    } else if (analysis.category === 'manual_only') {
      answers[q.id] = { text: '', source: 'manual', confidence: 0 };
    } else {
      questionsToGenerate.push({ ...q, tempId: String(i + 1) });
    }
  });

  if (questionsToGenerate.length === 0) {
    return answers;
  }

  // Construct prompt for remaining questions
  const questionsText = questionsToGenerate.map(q =>
    `${q.tempId}. [ID: ${q.id}] "${q.text}" (type: ${q.type}${q.options.length ? `, options: ${q.options.join(', ')}` : ''})`
  ).join('\n');

  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt('answer_generation', `Form Title: "${formData.title}"\nForm Description: "${formData.description}"\n\nReturn JSON mapped by the 1-indexed number provided in the prompt.`)
    },
    {
      role: 'user',
      content: `Questions to answer:\n${questionsText}\n\nGenerate responses formatted as JSON.`
    }
  ];

  try {
    const responseText = await generate({
      task: 'answer_generation',
      messages,
      temperature: settings?.ai?.temperature || 0.7,
      maxTokens: 3000,
      jsonMode: true,
    });

    const parsed = parseJsonResponse(responseText);

    questionsToGenerate.forEach(q => {
      const entry = parsed[q.tempId];
      if (entry) {
        const text = typeof entry === 'string' ? entry : (entry.answer || '');
        let confidence = typeof entry.confidence === 'number' ? entry.confidence : 0.8;

        // If verbosity is low, we might truncate long text but let's trust the model instructions
        answers[q.id] = { text: String(text).trim(), source: 'ai', confidence };
      }
    });

  } catch (err) {
    console.warn('[AI Actions] Answer generation failed', err);
    // Fallback logic could go here
  }

  return answers;
}

// ─── Custom Rewrite (Quick Edit) ─────────────

export async function quickEditAnswer(question, currentAnswer, instruction) {
  const { settings } = getState();

  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt('quick_edit', `You are editing an existing answer based on user instruction. Return ONLY the edited text. Do not wrap in quotes.`)
    },
    {
      role: 'user',
      content: `Field: "${question.text}"\nCurrent Answer: "${currentAnswer}"\nUser Instruction: "${instruction}"\n\nProvide the new answer:`
    }
  ];

  try {
    const text = await generate({
      task: 'quick_edit',
      messages,
      temperature: 0.5,
      maxTokens: 1024,
      useCache: false,
    });

    return { text: text.trim().replace(/^["']|["']$/g, ''), source: 'edited', confidence: 1.0 };
  } catch (err) {
    console.error(err);
    throw new Error('Failed to edit answer.');
  }
}

// ─── Answer Regeneration ─────────────────────

export async function regenerateAnswer(question, currentAnswer) {
  const { settings } = getState();

  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt('regeneration', `Generate a completely DIFFERENT answer than the current one for the given question. Follow tone guidelines. Return ONLY the new answer text.`)
    },
    {
      role: 'user',
      content: `Question: "${question.text}"\nPrevious Answer: "${currentAnswer}"\n\nGenerate alternate answer:`
    }
  ];

  try {
    const text = await generate({
      task: 'regeneration',
      messages,
      temperature: 0.85,
      maxTokens: 1024,
      useCache: false,
    });

    return { text: text.trim().replace(/^["']|["']$/g, ''), source: 'ai', confidence: 0.85 };
  } catch (err) {
    console.error(err);
    throw new Error('Failed to regenerate answer.');
  }
}

// ─── Copilot Chat ────────────────────────────

export async function processChatMessage(userMessage, formContext, history = []) {
  const { settings } = getState();

  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt('copilot_chat', `You are FormMate's chat copilot. You assist the user with filling out the form titled "${formContext.title}".\nBe helpful, provide concrete suggestions, and answer questions clearly.`)
    },
    ...formattedHistory,
    {
      role: 'user',
      content: userMessage
    }
  ];

  try {
    const responseText = await generate({
      task: 'copilot_chat',
      messages,
      temperature: 0.7,
      maxTokens: 1024,
      useCache: false,
    });

    return responseText;
  } catch (err) {
    throw new Error('Chat generation failed.');
  }
}
