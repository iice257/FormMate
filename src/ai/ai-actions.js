// ═══════════════════════════════════════════
// FormMate — AI Actions Layer
// ═══════════════════════════════════════════
//
// High-level AI functions that build context-aware
// prompts using user profile, vault, and settings.
// ═══════════════════════════════════════════

import { generate, parseJsonResponse } from './ai-service.js';
import { getState } from '../state.js';
import { categorizeField } from './field-classifier.js';
import { buildSystemPrompt } from './system-prompts.js';

// ─── Form Analysis (Field Categorization) ────

/**
 * Pre-analyze the form to categorize fields: autofillable, generatable, manual-only.
 */
export async function analyzeFormFields(formData) {
  const analysis = {};
  formData.questions.forEach(q => {
    analysis[q.id] = categorizeField(q);
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
