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
    const response = await generate({
      task: 'form_parsing',
      messages,
      temperature: 0.2, // Low temperature for high accuracy
      maxTokens: 3000,
      jsonMode: true,
    });

    const parsed = parseJsonResponse(response);

    // Ensure IDs are strings and 1-indexed for internal consistency
    if (parsed.questions) {
      parsed.questions = parsed.questions.map((q, i) => ({
        ...q,
        id: String(i + 1)
      }));
    }

    return parsed;
  } catch (err) {
    console.error('[AI Actions] Form parsing failed:', err);
    throw new Error('Failed to parse form structure.');
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
      const responseText = await generate({
        task: 'answer_generation',
        messages,
        temperature: settings?.ai?.temperature || 0.7,
        maxTokens: 500,
        jsonMode: false,
      });

      answers[q.id] = { text: responseText.trim(), source: 'ai', confidence: 0.9 };
    } catch (err) {
      console.warn('[AI Actions] Answer generation failed for field', q.id, err);
      answers[q.id] = { text: '', source: 'ai', confidence: 0 };
    }

    if (onProgress) onProgress(i + 1, questions.length);
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

export async function processChatMessage(userMessage, formContext, history = [], activeFieldId = null) {
  const { settings, answers, userProfile, personality } = getState();

  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  const schemaContext = formContext.questions ? formContext.questions.map(q =>
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

  const systemPromptContent = `You are FormMate's chat copilot. You assist the user with filling out the form titled "${formContext.title}".

Full Form Schema & Current Answers:
${schemaContext}

${profileContext}
${activeFieldContext}

Writing Style: ${writingStyle}

Be helpful, provide concrete suggestions, and answer questions clearly, adapting to the specified writing style.`;

  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt('copilot_chat', systemPromptContent)
    },
    ...formattedHistory
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
