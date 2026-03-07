// ═══════════════════════════════════════════
// FormMate — Review Screen
// ═══════════════════════════════════════════

import { getState, updateAnswer } from '../state.js';
import { navigateTo } from '../router.js';
import { executeFormFill } from '../automation/form-filler.js';

export function reviewScreen() {
  const { formData, answers } = getState();

  if (!formData) {
    navigateTo('landing');
    return { html: '', init: () => { } };
  }

  const totalQuestions = formData.questions.length;
  const answeredCount = Object.values(answers).filter(a => a?.text).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  // Group questions by category (simple heuristic)
  const categorized = categorizeQuestions(formData.questions);

  const categorySections = Object.entries(categorized).map(([category, questions]) => {
    const rows = questions.map(q => {
      const answer = answers[q.id];
      const answerText = answer?.text || '';
      const source = answer?.source || 'empty';

      const badgeHtml = source === 'ai'
        ? `<span class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold"><span class="material-symbols-outlined text-[12px]">auto_awesome</span> AI Mapped</span>`
        : source === 'user'
          ? `<span class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold"><span class="material-symbols-outlined text-[12px]">edit</span> User Edited</span>`
          : `<span class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold"><span class="material-symbols-outlined text-[12px]">warning</span> Unanswered</span>`;

      const iconMap = {
        'Full Name': 'person', 'Email': 'mail', 'Phone': 'call', 'LinkedIn': 'link',
        'Date': 'calendar_today', 'Salary': 'payments', 'experience': 'work',
        'Passport': 'badge', 'Nationality': 'public', 'Address': 'home',
      };
      let icon = 'quiz';
      for (const [key, val] of Object.entries(iconMap)) {
        if (q.text.toLowerCase().includes(key.toLowerCase())) { icon = val; break; }
      }

      return `
        <div class="flex items-start gap-4 card-premium p-4 rounded-xl shadow-sm" data-review-id="${q.id}">
          <div class="flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 size-12">
            <span class="material-symbols-outlined">${icon}</span>
          </div>
          <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-slate-500 text-xs font-semibold uppercase tracking-wider">${escapeHtml(q.text)}</p>
              ${badgeHtml}
            </div>
            <div class="mt-1">
              <p class="review-answer text-slate-900 text-base font-medium ${!answerText ? 'text-slate-300 italic' : ''}" data-question-id="${q.id}">
                ${answerText ? escapeHtml(answerText) : 'No answer provided'}
              </p>
              <input type="text" class="review-edit hidden w-full mt-1 rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-sm py-2 px-3"
                data-question-id="${q.id}" value="${escapeAttr(answerText)}" />
            </div>
          </div>
          <button class="btn-edit-review p-2 text-slate-400 hover:text-primary transition-colors shrink-0" data-question-id="${q.id}">
            <span class="material-symbols-outlined">edit</span>
          </button>
        </div>
      `;
    }).join('');

    return `
      <section class="flex flex-col gap-3">
        <h3 class="text-slate-900 text-lg font-bold px-1">${escapeHtml(category)}</h3>
        ${rows}
      </section>
    `;
  }).join('');

  const html = `
    <div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      <div class="layout-container flex h-full grow flex-col">

        <!-- Header -->
        <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white sticky top-0 z-10">
          <div class="flex items-center gap-4 text-primary">
            <button id="btn-back" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="size-8 flex items-center justify-center bg-primary/10 rounded-lg">
              <span class="material-symbols-outlined text-primary">description</span>
            </div>
            <h2 class="text-slate-900 text-lg font-bold tracking-tight">Review & Confirmation</h2>
          </div>
          <button id="btn-close" class="flex items-center justify-center rounded-full size-10 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <main class="flex flex-1 justify-center py-8 px-4">
          <div class="flex flex-col max-w-[800px] flex-1 gap-6">

            <!-- Progress -->
            <div class="flex flex-col gap-4 p-6 card-premium rounded-xl shadow-sm">
              <div class="flex gap-6 justify-between items-center">
                <div class="flex flex-col">
                  <p class="text-slate-900 text-lg font-bold">Ready for Submission</p>
                  <p class="text-slate-500 text-sm">All ${totalQuestions} fields have been mapped.</p>
                </div>
                <div class="flex flex-col items-end">
                  <p class="text-primary text-xl font-bold">${progress}%</p>
                  <p class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Completed</p>
                </div>
              </div>
              <div class="rounded-full bg-slate-100 h-3 overflow-hidden">
                <div class="h-full rounded-full bg-primary animate-progress" style="width: ${progress}%"></div>
              </div>
            </div>

            <!-- Summary Title -->
            <div class="flex flex-col gap-2">
              <h1 class="text-slate-900 text-3xl font-bold leading-tight">Final Summary</h1>
              <p class="text-slate-500 text-base">Please review the responses below. AI-generated suggestions are marked for your verification.</p>
            </div>

            <!-- Categorized Responses -->
            ${categorySections}

            <!-- Trust Messaging -->
            <div class="flex items-start gap-4 p-5 rounded-xl bg-primary/5 border border-primary/10 mt-4">
              <span class="material-symbols-outlined text-primary mt-0.5">verified_user</span>
              <div class="flex flex-col gap-1">
                <p class="text-slate-900 text-sm font-bold">Secure Submission</p>
                <p class="text-slate-600 text-sm leading-relaxed">FormMate uses end-to-end encryption to fill your forms. Your data is only shared with the destination site during this session.</p>
              </div>
            </div>

            <!-- Fill Progress (hidden initially) -->
            <div id="fill-progress" class="hidden flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-primary/20">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary animate-spin">sync</span>
                <div>
                  <p class="text-slate-900 font-bold" id="fill-progress-label">Filling form...</p>
                  <p class="text-slate-500 text-sm" id="fill-progress-field">Starting...</p>
                </div>
              </div>
              <div class="rounded-full bg-slate-100 h-2 overflow-hidden">
                <div id="fill-progress-bar" class="h-full rounded-full bg-primary transition-all duration-300" style="width: 0%"></div>
              </div>
            </div>

            <!-- Action Footer -->
            <div class="flex flex-col gap-3 py-6 sticky bottom-0 bg-background-light/80 backdrop-blur-md">
              <button id="btn-fill" class="w-full flex items-center justify-center gap-2 rounded-xl h-14 bg-primary text-white font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 btn-press">
                <span class="material-symbols-outlined">bolt</span>
                Fill Form Automatically
              </button>
              <div class="flex justify-center gap-6">
                <button class="text-slate-500 text-sm font-medium hover:text-primary transition-colors underline underline-offset-4 decoration-slate-300">Save for Later</button>
                <button id="btn-back-workspace" class="text-slate-500 text-sm font-medium hover:text-primary transition-colors underline underline-offset-4 decoration-slate-300">Edit Answers</button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  `;

  function init(wrapper) {
    const btnBack = wrapper.querySelector('#btn-back');
    const btnClose = wrapper.querySelector('#btn-close');
    const btnFill = wrapper.querySelector('#btn-fill');
    const btnBackWorkspace = wrapper.querySelector('#btn-back-workspace');
    const fillProgress = wrapper.querySelector('#fill-progress');
    const fillProgressBar = wrapper.querySelector('#fill-progress-bar');
    const fillProgressLabel = wrapper.querySelector('#fill-progress-label');
    const fillProgressField = wrapper.querySelector('#fill-progress-field');

    btnBack.addEventListener('click', () => navigateTo('workspace'));
    btnClose.addEventListener('click', () => navigateTo('landing'));
    btnBackWorkspace.addEventListener('click', () => navigateTo('workspace'));

    // Inline edit
    wrapper.querySelectorAll('.btn-edit-review').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.dataset.questionId;
        const answerEl = wrapper.querySelector(`.review-answer[data-question-id="${qId}"]`);
        const editEl = wrapper.querySelector(`.review-edit[data-question-id="${qId}"]`);

        if (editEl.classList.contains('hidden')) {
          answerEl.classList.add('hidden');
          editEl.classList.remove('hidden');
          editEl.focus();
          btn.querySelector('.material-symbols-outlined').textContent = 'check';
        } else {
          const newValue = editEl.value.trim();
          updateAnswer(qId, newValue, 'user');
          answerEl.textContent = newValue || 'No answer provided';
          answerEl.classList.remove('hidden');
          answerEl.classList.toggle('text-slate-300', !newValue);
          answerEl.classList.toggle('italic', !newValue);
          editEl.classList.add('hidden');
          btn.querySelector('.material-symbols-outlined').textContent = 'edit';
        }
      });
    });

    // Fill form
    btnFill.addEventListener('click', async () => {
      btnFill.disabled = true;
      btnFill.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Filling...';
      fillProgress.classList.remove('hidden');

      const { formData: fd, answers: ans } = getState();

      await executeFormFill(fd, ans, (progress) => {
        fillProgressBar.style.width = progress.percent + '%';
        fillProgressLabel.textContent = `Filling form... ${progress.percent}%`;
        fillProgressField.textContent = `Field: ${progress.fieldName}`;

        if (progress.status === 'complete') {
          setTimeout(() => navigateTo('success'), 600);
        }
      });
    });
  }

  return { html, init };
}

function categorizeQuestions(questions) {
  const categories = {};
  const personalKeywords = ['name', 'email', 'phone', 'linkedin', 'address', 'passport', 'nationality', 'birth'];
  const experienceKeywords = ['experience', 'role', 'salary', 'work', 'job', 'career', 'team', 'start', 'relocate', 'tools', 'proficient'];

  questions.forEach(q => {
    const lower = q.text.toLowerCase();
    let category = 'Other Information';

    if (personalKeywords.some(k => lower.includes(k))) {
      category = 'Personal Information';
    } else if (experienceKeywords.some(k => lower.includes(k))) {
      category = 'Experience & Preferences';
    } else if (lower.includes('feedback') || lower.includes('improve') || lower.includes('additional') || lower.includes('goal') || lower.includes('recommend') || lower.includes('feature')) {
      category = 'Feedback & Details';
    } else if (lower.includes('travel') || lower.includes('visa') || lower.includes('stay') || lower.includes('denied') || lower.includes('insurance') || lower.includes('purpose') || lower.includes('accommodation')) {
      category = 'Travel Details';
    }

    if (!categories[category]) categories[category] = [];
    categories[category].push(q);
  });

  return categories;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
