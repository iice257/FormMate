// @ts-nocheck
import { getState, setState } from '../state';
import { navigateTo } from '../router';
import { MOCK_FORMS } from '../parser/mock-forms';
import { toast } from '../components/toast';
import { escapeAttr, escapeHtml, safeHttpUrl } from '../utils/escape';
import { openAccountModal } from '../components/layout';

export function examplesScreen() {
  const { isAuthenticated, userProfile } = getState();
  const displayFirstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const avatarFromProfile = safeHttpUrl(userProfile?.avatar);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;

  const authButtonHtml = isAuthenticated
    ? `<button id="btn-profile" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
         <img src="${escapeAttr(avatarSrc)}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
         <span class="truncate max-w-[100px]">${displayFirstName}</span>
       </button>`
    : `<button class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 btn-press" id="btn-login">Sign In</button>`;

  const demos = [
    {
      id: 'job-application',
      title: 'Senior Product Designer',
      company: 'Lever / CreativeSync',
      icon: 'work',
      color: 'blue',
      fields: MOCK_FORMS['job-application']?.questions?.length || 0,
      url: 'demo://job-application',
      desc: 'Standard tech job application with portfolio linking, years of experience, cover letter, and salary expectations.',
      tags: ['Employment', 'Long-form'],
    },
    {
      id: 'customer-feedback',
      title: 'Post-Purchase Satisfaction',
      company: 'Google Forms',
      icon: 'reviews',
      color: 'yellow',
      fields: MOCK_FORMS['customer-feedback']?.questions?.length || 0,
      url: 'demo://customer-feedback',
      desc: 'Short customer satisfaction survey with star ratings, multiple-choice questions, and one open-ended feedback field.',
      tags: ['Survey', 'Quick'],
    },
    {
      id: 'travel-visa',
      title: 'Schengen Visa Application',
      company: 'Typeform / Gov.Travel',
      icon: 'flight_takeoff',
      color: 'indigo',
      fields: MOCK_FORMS['travel-visa']?.questions?.length || 0,
      url: 'demo://travel-visa',
      desc: 'International government document requiring passport details, travel itinerary, accommodation proof, and deep personal history.',
      tags: ['Government', 'Complex'],
    },
    {
      id: 'patient-intake',
      title: 'New Patient Intake',
      company: 'Jotform / Sutter Health',
      icon: 'medical_services',
      color: 'rose',
      fields: MOCK_FORMS['patient-intake']?.questions?.length || 0,
      url: 'demo://patient-intake',
      desc: 'Lengthy health history form logging prior conditions, surgical records, current medications, allergies, and emergency contacts.',
      tags: ['Medical', 'Sensitive'],
    },
    {
      id: 'scholarship',
      title: 'STEM Excellence Scholarship',
      company: 'Jotform / National Science Foundation',
      icon: 'school',
      color: 'purple',
      fields: MOCK_FORMS['scholarship']?.questions?.length || 0,
      url: 'demo://scholarship',
      desc: 'Educational scholarship requiring GPA transcripts, essay prompts, extracurricular activities, and recommendation details.',
      tags: ['Education', 'Essay-heavy'],
    },
    {
      id: 'insurance-quote',
      title: 'Auto Insurance Quote',
      company: 'Typeform / GEICO',
      icon: 'directions_car',
      color: 'sky',
      fields: MOCK_FORMS['insurance-quote']?.questions?.length || 0,
      url: 'demo://insurance-quote',
      desc: 'Vehicle identification, driving history, accident records, and annual mileage for an instant insurance premium estimate.',
      tags: ['Insurance', 'Multi-step'],
    },
    {
      id: 'b2b-demo',
      title: 'Enterprise Demo Request',
      company: 'Typeform / Salesforce',
      icon: 'business_center',
      color: 'slate',
      fields: MOCK_FORMS['b2b-demo']?.questions?.length || 0,
      url: 'demo://b2b-demo',
      desc: 'B2B lead generation form capturing company size, annual revenue, use-case description, and preferred demo schedule.',
      tags: ['Enterprise', 'Short'],
    },
    {
      id: 'rental-app',
      title: 'Apartment Lease Application',
      company: 'Google Forms / Zillow',
      icon: 'apartment',
      color: 'orange',
      fields: MOCK_FORMS['rental-app']?.questions?.length || 0,
      url: 'demo://rental-app',
      desc: 'Residential history, employment verification, monthly income, landlord references, and pet or vehicle disclosures.',
      tags: ['Real Estate', 'Detailed'],
    },
    {
      id: 'grant-application',
      title: 'Community Impact Grant',
      company: 'SurveyMonkey / Ford Foundation',
      icon: 'volunteer_activism',
      color: 'emerald',
      fields: MOCK_FORMS['grant-application']?.questions?.length || 0,
      url: 'demo://grant-application',
      desc: 'Nonprofit grant proposal requiring mission statement, budget breakdown, beneficiary demographics, and measurable outcomes.',
      tags: ['Nonprofit', 'Proposal'],
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    yellow: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  const html = `
    <div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-mesh">
      <div class="layout-container flex h-full grow flex-col">
        <header data-fm-hide-on-scroll="true" class="flex items-center justify-between px-6 py-6 md:px-12 lg:px-24 sticky top-0 z-50 transition-all">
          <div class="flex-1 flex items-center justify-start">
            <button type="button" class="flex items-center gap-2.5 btn-press cursor-pointer bg-transparent border-0 p-0" id="btn-logo-home" aria-label="Go to home">
              <div class="size-10 flex shrink-0 items-center justify-center">
                <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
              </div>
              <h2 class="text-slate-900 text-2xl font-black tracking-tighter" style="font-family: var(--fm-font-sans)">Form<span class="text-primary">Mate</span></h2>
            </button>
          </div>

          <nav class="hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-full px-2.5 py-2 text-[15px] font-bold text-slate-500">
            <button type="button" class="px-6 py-2 rounded-full bg-slate-100 text-slate-900 transition-all cursor-pointer" id="nav-home">Home</button>
            <button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-docs">Docs</button>
          </nav>

          <div class="flex-1 flex items-center justify-end gap-3">
            ${authButtonHtml}
          </div>
        </header>

        <main class="flex-1 px-6 pb-16 pt-8 md:px-12 lg:px-24 lg:pt-12">
          <div class="mx-auto max-w-6xl">
            <div class="mb-12 text-center">
              <h1 class="mt-6 text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
                Explore Real FormMate
                <span class="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-accent">Use Cases</span>
              </h1>
              <p class="mt-5 text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Browse the catalog freely. When you are ready to try one, sign in and launch any example instantly.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="examples-grid">
              ${demos.map((demo) => `
                <button type="button" class="demo-card relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/90 backdrop-blur-md p-6 text-left shadow-[0_20px_60px_-35px_rgba(37,99,235,0.25)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_80px_-32px_rgba(37,99,235,0.35)] group" data-url="${demo.url}" aria-label="Use demo: ${escapeAttr(demo.title)}">
                  <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary/8 via-sky-100/50 to-transparent pointer-events-none"></div>
                  <div class="relative">
                    <div class="mb-5 flex items-start justify-between gap-4">
                      <div class="flex items-center justify-center size-12 rounded-2xl border ${colorClasses[demo.color]} shadow-sm">
                        <span class="material-symbols-outlined text-2xl">${demo.icon}</span>
                      </div>
                      <span class="material-symbols-outlined text-slate-300 transition-all group-hover:text-primary group-hover:translate-x-1">arrow_forward</span>
                    </div>

                    <div class="mb-5">
                      <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">${demo.company}</p>
                      <h3 class="text-xl font-black text-slate-900 tracking-tight leading-tight mb-3 group-hover:text-primary transition-colors">${demo.title}</h3>
                      <p class="text-sm text-slate-500 leading-relaxed">${demo.desc}</p>
                    </div>

                    <div class="mb-4 flex flex-wrap gap-2">
                      ${(demo.tags || []).map((tag) => `<span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">${tag}</span>`).join('')}
                      ${demo.fields ? `<span class="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">${demo.fields} fields</span>` : ''}
                    </div>

                    <div class="rounded-2xl border border-slate-100 bg-slate-50/90 px-3 py-2 text-xs font-mono text-slate-500 truncate">
                      ${demo.url.startsWith('demo://') ? demo.url : demo.url.replace('https://', '')}
                    </div>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  function init(wrapper) {
    wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => navigateTo('landing'));
    wrapper.querySelector('#nav-home')?.addEventListener('click', () => navigateTo('landing'));
    wrapper.querySelector('#nav-docs')?.addEventListener('click', () => navigateTo('docs'));
    wrapper.querySelector('#btn-login')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelector('#btn-profile')?.addEventListener('click', () => openAccountModal('profile'));

    wrapper.querySelectorAll('.demo-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (!getState().isAuthenticated) {
          toast.info('Sign in to try examples and use FormMate AI.');
          navigateTo('auth');
          return;
        }
        setState({ formUrl: card.dataset.url, capturePayload: null, imageArtifacts: null, parseResult: null, formData: null });
        navigateTo('analyzing');
      });
    });
  }

  return { html, init };
}
