// ═══════════════════════════════════════════
// FormMate — Form Filler (Automation Layer)
// ═══════════════════════════════════════════

/**
 * Simulate filling a form with approved answers.
 * Returns a progress callback pattern.
 */
export async function executeFormFill(formData, answers, onProgress) {
  const questions = formData.questions;
  const total = questions.length;

  for (let i = 0; i < total; i++) {
    const question = questions[i];
    const answer = answers[question.id];

    // Simulate filling each field
    onProgress({
      current: i + 1,
      total,
      percent: Math.round(((i + 1) / total) * 100),
      fieldName: question.text,
      status: 'filling'
    });

    // Simulate typing/interaction delay
    await delay(300 + Math.random() * 400);
  }

  // Final completion
  onProgress({
    current: total,
    total,
    percent: 100,
    fieldName: 'All fields',
    status: 'complete'
  });

  return { success: true, filledCount: total };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
