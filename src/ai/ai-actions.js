// ═══════════════════════════════════════════
// FormMate — AI Actions Layer
// ═══════════════════════════════════════════
//
// High-level AI functions that the app calls.
// Each function builds the correct prompt and
// routes through AIService to the right model.
//
// Uses multi-model routing:
//   Form understanding  → gpt-oss-120b
//   Answer generation   → gpt-oss-20b
//   Copilot chat        → qwen-2.5-32b
//   Quick edits         → qwen-2.5-7b
// ═══════════════════════════════════════════

import { getState } from '../state.js';
import { generate, parseJsonResponse } from './ai-service.js';
import { MOCK_AI_ANSWERS, MOCK_CHAT_RESPONSES } from '../parser/mock-forms.js';

// ─── Answer Generation ───────────────────────

/**
 * Generate AI answers for all questions in a form.
 * Uses gpt-oss-120b for form understanding, then gpt-oss-20b for answer generation.
 */
export async function generateAnswers(formData) {
  const { groqApiKey } = getState();
  if (!groqApiKey) return generateAnswersMock(formData);

  const questionsText = formData.questions.map((q, i) =>
    `${i + 1}. "${q.text}" (type: ${q.type}${q.options.length ? `, options: ${q.options.join(', ')}` : ''}${q.required ? ', required' : ''})`
  ).join('\n');

  const messages = [
    {
      role: 'system',
      content: `You are FormMate, an expert AI form assistant. Generate realistic, professional answers for each form question. You MUST return valid JSON only — an object where keys are question numbers (1-indexed) and values are answer objects with "answer" and "confidence" fields.

Rules:
- Never fabricate personal information that could be harmful
- Use realistic placeholder data (professional names, emails, etc.)
- Match answer format to question type (dates for date fields, options for radio/checkbox)
- Be specific and professional
- For radio/dropdown, pick from the available options
- For checkbox, pick 1-3 relevant options separated by commas`
    },
    {
      role: 'user',
      content: `Form: "${formData.title}"
Description: ${formData.description}

Questions:
${questionsText}

Generate appropriate answers. Return ONLY valid JSON like:
{"1": {"answer": "answer text", "confidence": "high"}, "2": {"answer": "...", "confidence": "medium"}}`
    }
  ];

  try {
    const responseText = await generate({
      task: 'answer_generation',
      messages,
      apiKey: groqApiKey,
      temperature: 0.7,
      maxTokens: 2048,
      jsonMode: true,
    });

    const parsed = parseJsonResponse(responseText);
    const answers = {};

    formData.questions.forEach((q, i) => {
      const key = String(i + 1);
      const entry = parsed[key];
      const answerText = typeof entry === 'string' ? entry : entry?.answer || '';
      const confidence = entry?.confidence === 'high' ? 0.92 : entry?.confidence === 'medium' ? 0.80 : 0.70;

      answers[q.id] = { text: answerText, source: 'ai', confidence };
    });

    return answers;

  } catch (err) {
    console.warn('[AI Actions] Answer generation failed, falling back to mock:', err);
    return generateAnswersMock(formData);
  }
}

// ─── Answer Regeneration ─────────────────────

/**
 * Regenerate a single answer with a different response.
 * Uses gpt-oss-20b.
 */
export async function regenerateAnswer(question, currentAnswer) {
  const { groqApiKey } = getState();
  if (!groqApiKey) return regenerateAnswerMock(question);

  const messages = [
    {
      role: 'system',
      content: `You are FormMate AI. Generate a different, equally professional answer for the given form question. Return ONLY the answer text — no quotes, no formatting, no explanation.`
    },
    {
      role: 'user',
      content: `Question: "${question.text}" (type: ${question.type}${question.options?.length ? `, options: ${question.options.join(', ')}` : ''})
Previous answer: "${currentAnswer}"

Generate a completely different answer. Return ONLY the answer text.`
    }
  ];

  try {
    const text = await generate({
      task: 'regeneration',
      messages,
      apiKey: groqApiKey,
      temperature: 0.85,
      maxTokens: 512,
      useCache: false, // Always generate fresh
    });

    return { text: text.trim().replace(/^["']|["']$/g, ''), source: 'ai', confidence: 0.85 };
  } catch {
    return regenerateAnswerMock(question);
  }
}

// ─── Copilot Chat ────────────────────────────

/**
 * Process a conversational chat message.
 * Uses qwen-2.5-32b for natural dialogue.
 */
export async function processChatMessage(userMessage, formContext) {
  const { groqApiKey } = getState();
  if (!groqApiKey) return chatMock(userMessage);

  const messages = [
    {
      role: 'system',
      content: `You are FormMate AI, a friendly and smart form assistant. You're helping the user complete a form titled "${formContext.title}" with ${formContext.questionCount} questions.

Your role:
- Help refine and improve their form answers
- Suggest better wording, more professional tone, or missing details
- Answer questions about how to fill specific fields
- Be concise, warm, and helpful
- If they ask to modify a specific answer, describe what you'd change
- Never fabricate personal information
- Always respect user control — suggest, don't dictate`
    },
    {
      role: 'user',
      content: userMessage
    }
  ];

  try {
    const text = await generate({
      task: 'copilot_chat',
      messages,
      apiKey: groqApiKey,
      temperature: 0.75,
      maxTokens: 512,
    });

    return {
      text,
      hasAction: userMessage.toLowerCase().match(/rewrite|shorten|expand|change|update|modify/) !== null,
    };
  } catch {
    return chatMock(userMessage);
  }
}

// ─── Quick Edits ─────────────────────────────

/**
 * Perform a quick edit on an answer (shorten, expand, professional, friendly).
 * Uses qwen-2.5-7b for fast, low-latency responses.
 *
 * @param {string} currentText - The current answer text
 * @param {string} action - one of: 'shorten', 'expand', 'professional', 'friendly', 'rewrite'
 * @param {string} questionText - The question being answered
 * @returns {Promise<string>} The edited text
 */
export async function quickEdit(currentText, action, questionText) {
  const { groqApiKey } = getState();

  if (!groqApiKey || !currentText.trim()) {
    // Fallback: simple local edits
    return quickEditLocal(currentText, action);
  }

  const instructions = {
    shorten: 'Make this answer significantly shorter and more concise. Keep the key information. Remove filler words and redundancy.',
    expand: 'Expand this answer with more specific details, examples, and context. Make it more comprehensive while staying relevant.',
    professional: 'Rewrite this answer in a more professional, formal tone. Use proper business language. Remove casual phrasing.',
    friendly: 'Rewrite this answer in a warmer, more personable tone. Make it conversational but still respectful.',
    rewrite: 'Completely rewrite this answer with fresh wording. Keep the same meaning but use a totally different structure and phrasing.',
  };

  const messages = [
    {
      role: 'system',
      content: `You are a writing assistant. ${instructions[action] || instructions.rewrite}

Return ONLY the edited text. No quotes, no explanation, no preamble.`
    },
    {
      role: 'user',
      content: `Question: "${questionText}"
Answer to edit: "${currentText}"

Return ONLY the edited answer text:`
    }
  ];

  try {
    const text = await generate({
      task: 'quick_edit',
      messages,
      apiKey: groqApiKey,
      temperature: 0.6,
      maxTokens: 512,
    });

    return text.trim().replace(/^["']|["']$/g, '');
  } catch {
    return quickEditLocal(currentText, action);
  }
}

// ─── Local Quick Edit Fallback ───────────────

function quickEditLocal(text, action) {
  switch (action) {
    case 'shorten': {
      const sentences = text.split(/\.\s+/);
      return sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ').replace(/\.?\s*$/, '.');
    }
    case 'professional': {
      return text
        .replace(/\bi\b/g, 'I')
        .replace(/gonna/gi, 'going to')
        .replace(/wanna/gi, 'want to')
        .replace(/can't/gi, 'cannot')
        .replace(/won't/gi, 'will not')
        .replace(/\.?\s*$/, '.');
    }
    case 'friendly': {
      return text.replace(/\.?\s*$/, '') + '. 😊';
    }
    case 'expand': {
      return text + ' Additionally, I bring relevant experience and a strong commitment to delivering excellent results in this area.';
    }
    default:
      return text;
  }
}

// ─── Mock Implementations ────────────────────
// Preserved for demo mode when no API key is available

function generateAnswersMock(formData) {
  const urlLower = (formData.url || '').toLowerCase();
  let mockKey = 'customer-feedback';

  if (urlLower.includes('job') || urlLower.includes('lever') || urlLower.includes('career') || urlLower.includes('application')) {
    mockKey = 'job-application';
  } else if (urlLower.includes('visa') || urlLower.includes('travel') || urlLower.includes('gov')) {
    mockKey = 'travel-visa';
  }

  if (MOCK_AI_ANSWERS[mockKey]) {
    return { ...MOCK_AI_ANSWERS[mockKey] };
  }

  const answers = {};
  formData.questions.forEach(q => {
    answers[q.id] = generateGenericAnswer(q);
  });
  return answers;
}

function generateGenericAnswer(question) {
  const typeDefaults = {
    'short_text': { text: 'Sample response', source: 'ai', confidence: 0.80 },
    'long_text': { text: 'This is a thoughtfully crafted response that addresses the question with specific details and relevant context.', source: 'ai', confidence: 0.82 },
    'radio': { text: question.options?.[0] || 'Option A', source: 'ai', confidence: 0.75 },
    'checkbox': { text: question.options?.slice(0, 2).join(', ') || 'Option A, Option B', source: 'ai', confidence: 0.78 },
    'dropdown': { text: question.options?.[0] || 'Selected option', source: 'ai', confidence: 0.80 },
    'date': { text: '2026-04-15', source: 'ai', confidence: 0.70 },
    'scale': { text: '8', source: 'ai', confidence: 0.75 },
    'file_upload': { text: '', source: 'empty', confidence: 0 },
  };
  return typeDefaults[question.type] || typeDefaults['short_text'];
}

function regenerateAnswerMock(question) {
  const answer = generateGenericAnswer(question);
  answer.text = answer.text + ' (regenerated)';
  answer.confidence = Math.max(0.7, answer.confidence - 0.05);
  return answer;
}

function chatMock(userMessage) {
  const msgLower = userMessage.toLowerCase();
  const match = MOCK_CHAT_RESPONSES.find(r => msgLower.includes(r.trigger));
  const response = match || MOCK_CHAT_RESPONSES.find(r => r.trigger === 'default');

  return {
    text: response.response,
    hasAction: msgLower.includes('rewrite') || msgLower.includes('shorten') || msgLower.includes('expand'),
  };
}
