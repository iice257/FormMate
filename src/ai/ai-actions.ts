// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — AI Actions Layer
// ═══════════════════════════════════════════
//
// High-level AI functions that build context-aware
// prompts using user profile, vault, and settings.
// ═══════════════════════════════════════════

import { AI_SURFACES, generateText, generateJson, getAiErrorMessage, isRetryableAiError, normalizeAiError } from './ai-service';
import { getState } from '../state';
import { categorizeField } from './field-classifier';
import { buildSystemPrompt } from './system-prompts';

// ─── HTML Form Parsing (Scraping Transition) ─

/**
 * Use AI to extract structured form questions from raw HTML.
 */
export async function parseFormHtml(html, url) {
  const { settings } = getState();

  const messages = [
    {
      role: 'system',
      content: `You are a web form parser. Analyze the provided HTML and extract all form fields.
Return valid JSON ONLY.
Output Format:
{
  "title": "Form Name",
  "description": "Short description",
  "questions": [
    {
      "id": "1",
      "text": "Question label",
      "type": "short_text | long_text | radio | checkbox | dropdown | date",
      "options": ["Option 1", "Option 2"],
      "required": true
    }
  ]
}

Extraction Rules:
1. Identify labels from <label> tags, placeholders, or nearby text.
2. Detect types correctly: <textarea> is long_text, <select> is dropdown.
3. For radio/checkbox/dropdown, extract ALL available options.
4. Truncate very long options if they seem like decorative text.
5. If no clear title/description is found, invent a logical one based on the fields.`
    },
    {
      role: 'user',
      content: `URL: ${url}\n\nHTML Content:\n${html.substring(0, 15000)}` // Limit to 15k chars to fit context
    }
  ];

  try {
    const parsed = await generateJson({
      task: 'form_parsing',
      surface: AI_SURFACES.ANALYZING,
      messages,
      temperature: 0.2, // Low temperature for high accuracy
      maxTokens: 3000,
    });

    // Ensure IDs are strings and 1-indexed for internal consistency
    if (parsed.questions) {
      parsed.questions = parsed.questions.map((q, i) => ({
        ...q,
        id: String(i + 1)
      }));
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.questions)) {
      const invalidShapeError = new Error('Invalid parsed form response.');
      invalidShapeError.code = 'INVALID_JSON';
      throw invalidShapeError;
    }

    return parsed;
  } catch (err) {
    console.error('[AI Actions] Form parsing failed:', err);
    const normalized = normalizeAiError(err, {
      code: 'FORM_PARSING_FAILED',
      message: 'Failed to parse the form structure. Please try again.',
    });
    const error = new Error(getAiErrorMessage(normalized, 'Failed to parse the form structure. Please try again.'));
    error.code = normalized.code || 'FORM_PARSING_FAILED';
    error.retryable = isRetryableAiError(normalized);
    error.status = normalized.status;
    error.retryAfter = normalized.retryAfter;
    error.details = normalized.details;
    throw error;
  }
}

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
 * Generate AI answers field-by-field (incremental architecture).
 * Respects 'autofillable' vs 'generatable' vs 'manual_only'.
 */
export async function generateAnswers(formData, onProgress) {
  const { settings, userProfile, personality } = getState();
  const fieldAnalysis = await analyzeFormFields(formData);
  const answers = {};
  const diagnostics = {
    status: 'ok',
    summary: '',
    totalQuestions: Array.isArray(formData?.questions) ? formData.questions.length : 0,
    aiEligible: 0,
    generated: 0,
    failed: 0,
    failures: [],
  };

  const { questions } = formData;

  const writingStyle = userProfile?.preferredTone || personality || 'professional';
  const profileContext = userProfile ? `
User Profile Context:
- Name: ${userProfile.name || 'Not provided'}
- Bio: ${userProfile.bio || 'Not provided'}
- Experience: ${userProfile.experience || 'Not provided'}
- Skills: ${userProfile.commonInfo?.skills || 'Not provided'}
- Education: ${userProfile.commonInfo?.education || 'Not provided'}
` : 'No user profile provided.';

  // Fire requests field-by-field (limited concurrency to avoid rate limits)
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const analysis = fieldAnalysis[q.id];

    if (analysis.category === 'autofillable' && analysis.match) {
      answers[q.id] = { text: String(analysis.match), source: 'autofill', confidence: 1.0 };
      if (onProgress) onProgress(i + 1, questions.length);
      continue;
    }

    if (analysis.category === 'manual_only') {
      answers[q.id] = { text: '', source: 'manual', confidence: 0 };
      if (onProgress) onProgress(i + 1, questions.length);
      continue;
    }

    // Only 'generatable' fields reach here
    diagnostics.aiEligible += 1;
    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant filling out a single field in a form.
Form: "${formData.title}" - ${formData.description}
${profileContext}
Write in a ${writingStyle} tone.
Interpretation Hint: Focus on providing a ${analysis.interpretationTag.replace('_', ' ')}.
Return ONLY the raw answer text for the field, without quotes, explanations, or JSON formatting.`
      },
      {
        role: 'user',
        content: `Question text: "${q.text}"
Field Type: "${q.type}"
Options: ${q.options && q.options.length ? q.options.join(', ') : 'None'}`
      }
    ];

    try {
      const responseText = await generateText({
        task: 'answer_generation',
        surface: AI_SURFACES.ANALYZING,
        messages,
        temperature: settings?.ai?.temperature || 0.7,
        maxTokens: 500,
      });

      answers[q.id] = { text: responseText.trim(), source: 'ai', confidence: 0.9 };
      diagnostics.generated += 1;
    } catch (err) {
      console.warn('[AI Actions] Answer generation failed for field', q.id, err);
      const normalized = normalizeAiError(err, {
        code: 'ANSWER_GENERATION_FAILED',
        message: 'Failed to generate this answer.',
      });
      answers[q.id] = { text: '', source: 'ai', confidence: 0 };
      diagnostics.failed += 1;
      diagnostics.failures.push({
        questionId: String(q.id),
        questionText: q.text,
        code: normalized.code || 'ANSWER_GENERATION_FAILED',
        message: getAiErrorMessage(normalized, 'Failed to generate this answer.'),
        retryable: isRetryableAiError(normalized),
        status: normalized.status,
        retryAfter: normalized.retryAfter,
      });
    }

    if (onProgress) onProgress(i + 1, questions.length);
  }

  if (diagnostics.failed > 0) {
    diagnostics.status = diagnostics.generated > 0 ? 'partial' : 'failed';
    const leadFailure = diagnostics.failures[0];
    diagnostics.summary = diagnostics.generated > 0
      ? `${diagnostics.failed} AI suggestion${diagnostics.failed === 1 ? '' : 's'} could not be generated. You can keep editing manually and retry later.`
      : leadFailure?.message || 'AI suggestions are unavailable right now.';
  } else {
    diagnostics.summary = diagnostics.aiEligible > 0
      ? `Generated ${diagnostics.generated} AI suggestion${diagnostics.generated === 1 ? '' : 's'} successfully.`
      : 'No AI-generated fields were needed for this form.';
  }

  return { answers, diagnostics };
}

// ─── Custom Rewrite (Quick Edit) ─────────────

export async function quickEditAnswer(question, currentAnswer, instruction, { surface = AI_SURFACES.WORKSPACE } = {}) {
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
    const text = await generateText({
      task: 'quick_edit',
      surface,
      messages,
      temperature: 0.5,
      maxTokens: 1024,
      useCache: false,
    });

    return { text: text.trim().replace(/^["']|["']$/g, ''), source: 'edited', confidence: 1.0 };
  } catch (err) {
    console.error(err);
    const normalized = normalizeAiError(err, {
      code: 'QUICK_EDIT_FAILED',
      message: 'Failed to edit the answer. Please try again.',
    });
    const error = new Error(getAiErrorMessage(normalized, 'Failed to edit the answer. Please try again.'));
    error.code = normalized.code || 'QUICK_EDIT_FAILED';
    error.retryable = isRetryableAiError(normalized);
    error.status = normalized.status;
    error.retryAfter = normalized.retryAfter;
    error.details = normalized.details;
    throw error;
  }
}

// ─── Answer Regeneration ─────────────────────

export async function regenerateAnswer(question, currentAnswer, { surface = AI_SURFACES.WORKSPACE } = {}) {
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
    const text = await generateText({
      task: 'regeneration',
      surface,
      messages,
      temperature: 0.85,
      maxTokens: 1024,
      useCache: false,
    });

    return { text: text.trim().replace(/^["']|["']$/g, ''), source: 'ai', confidence: 0.85 };
  } catch (err) {
    console.error(err);
    const normalized = normalizeAiError(err, {
      code: 'REGENERATION_FAILED',
      message: 'Failed to regenerate the answer. Please try again.',
    });
    const error = new Error(getAiErrorMessage(normalized, 'Failed to regenerate the answer. Please try again.'));
    error.code = normalized.code || 'REGENERATION_FAILED';
    error.retryable = isRetryableAiError(normalized);
    error.status = normalized.status;
    error.retryAfter = normalized.retryAfter;
    error.details = normalized.details;
    throw error;
  }
}

// ─── Copilot Chat ────────────────────────────

export async function processChatMessage(userMessage, formContext, history = [], activeFieldId = null, options = {}) {
  const { settings, answers, userProfile, personality } = getState();
  const surface = options.surface || AI_SURFACES.WORKSPACE;
  const attachments = Array.isArray(options.attachments) ? options.attachments : [];
  const safeFormContext = formContext && typeof formContext === 'object' ? formContext : {};
  const formQuestions = Array.isArray(safeFormContext.questions) ? safeFormContext.questions : [];
  const currentUserMessage = String(userMessage || '').trim();

  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  const schemaContext = formQuestions.length ? formQuestions.map(q =>
    `- [ID: ${q.id}] ${q.text} (Type: ${q.type}, Current Answer: ${answers?.[q.id]?.text || 'None'})`
  ).join('\n') : '';

  const writingStyle = userProfile?.preferredTone || personality || 'professional';

  const profileContext = userProfile ? `
User Profile Context:
- Name: ${userProfile.name || 'Not provided'}
- Occupation: ${userProfile.occupation || 'Not provided'}
- Experience: ${userProfile.experience || 'Not provided'}
- Bio: ${userProfile.bio || 'Not provided'}
` : 'No user profile provided.';

  const activeFieldContext = activeFieldId ? `
Currently Selected Field Focus:
The user is currently focused on the field with ID: ${activeFieldId}.
If they ask about "this field", they are referring to this one.` : '';

  const contextHints = [
    schemaContext ? `Form Schema:\n${schemaContext}` : '',
    profileContext,
    activeFieldContext,
    `Writing Style: ${writingStyle}`,
  ].filter(Boolean).join('\n\n');

  const messages = [...formattedHistory];
  if (currentUserMessage && (messages[messages.length - 1]?.role !== 'user' || messages[messages.length - 1]?.content !== currentUserMessage)) {
    messages.push({
      role: 'user',
      content: currentUserMessage,
    });
  }

  try {
    const responseText = await generateText({
      task: 'copilot_chat',
      surface,
      messages,
      temperature: 0.7,
      maxTokens: 1024,
      useCache: false,
      context: {
        formTitle: formContext?.title || '',
        activeFieldId: activeFieldId || '',
        activeFieldText: formQuestions.find((entry) => String(entry?.id) === String(activeFieldId))?.text || '',
        formQuestions: formQuestions.map((entry) => ({ id: entry.id, text: entry.text, type: entry.type })),
        conversationHints: contextHints,
      },
      attachments,
    });

    return responseText;
  } catch (err) {
    const normalized = normalizeAiError(err, {
      code: 'CHAT_GENERATION_FAILED',
      message: 'Chat generation failed. Please try again.',
    });
    const error = new Error(getAiErrorMessage(normalized, 'Chat generation failed. Please try again.'));
    error.code = normalized.code || 'CHAT_GENERATION_FAILED';
    error.retryable = isRetryableAiError(normalized);
    error.status = normalized.status;
    error.retryAfter = normalized.retryAfter;
    error.details = normalized.details;
    throw error;
  }
}
