// @ts-nocheck
import { getState, setState } from '../state';
import { getHomeScreenForUser, navigateTo } from '../router';
import { MOCK_FORMS } from '../parser/mock-forms';

export function examplesScreen() {
  const { isAuthenticated, userProfile } = getState();
  const displayFirstName = userProfile?.name?.split(' ')[0] || 'User';
  const avatarFromProfile = userProfile?.avatar || '';
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;

  const authButtonHtml = isAuthenticated
    ? `<button id="btn-profile" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
         <img src="${avatarSrc}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
         <span class="truncate max-w-[100px]">${displayFirstName}</span>
       </button>`
    : `<button class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-lg btn-press" id="btn-login">Sign In</button>`;

  const html = `
    <div class="min-h-screen w-full bg-mesh flex flex-col">
      
      <!-- Header -->
      <header class="h-16 border-b border-slate-200 flex items-center justify-between px-6 md:px-12 sticky top-0 z-50 glass">
        <div class="flex-1 flex justify-start">
          <button id="btn-back" class="bg-slate-900 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-slate-800 transition-all btn-press">
            <span class="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
        </div>
        <div class="flex-1 flex justify-center items-center">
            <button type="button" class="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0" id="btn-home" aria-label="Go to home">
                <img src="/logo.png" class="size-8" alt="Logo" />
                <span class="text-xl font-black text-slate-900 tracking-tight">FormMate</span>
            </button>
        </div>
        <div class="flex-1 flex items-center justify-end">
          ${authButtonHtml}
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 animate-screen-enter">
        <div class="mb-12 text-center max-w-2xl mx-auto space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-widest rounded-full border border-primary/20">
            <span class="material-symbols-outlined text-[14px]">extension</span>
            Demo Gallery
          </div>
          <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            See FormMate in Action
          </h1>
          <p class="text-lg text-slate-500">
            Click any form below to instantly see how FormMate's AI parses the URL, understands the fields, and generates smart answers.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children" id="examples-grid">
          <!-- Populated by JS -->
        </div>
      </main>
    </div>
  `;

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
      tags: ['Employment', 'Long-form']
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
      tags: ['Survey', 'Quick']
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
      tags: ['Government', 'Complex']
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
      tags: ['Medical', 'Sensitive']
    },
    {
      id: 'scholarship',
      title: 'STEM Excellence Scholarship',
      company: 'Jotform / National Science Foundation',
      icon: 'school',
      color: 'purple',
      fields: MOCK_FORMS['scholarship']?.questions?.length || 0,
      url: 'demo://scholarship',
      desc: 'Educational scholarship requiring GPA transcripts, two essay prompts (500 words each), extracurricular activities, and faculty recommendation details.',
      tags: ['Education', 'Essay-heavy']
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
      tags: ['Insurance', 'Multi-step']
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
      tags: ['Enterprise', 'Short']
    },
    {
      id: 'rental-app',
      title: 'Apartment Lease Application',
      company: 'Google Forms / Zillow',
      icon: 'apartment',
      color: 'orange',
      fields: MOCK_FORMS['rental-app']?.questions?.length || 0,
      url: 'demo://rental-app',
      desc: 'Residential history, employment verification, monthly income, landlord references, and pet/vehicle disclosures.',
      tags: ['Real Estate', 'Detailed']
    },
    {
      id: 'grant-application',
      title: 'Community Impact Grant',
      company: 'SurveyMonkey / Ford Foundation',
      icon: 'volunteer_activism',
      color: 'emerald',
      fields: MOCK_FORMS['grant-application']?.questions?.length || 0,
      url: 'demo://grant-application',
      desc: 'Nonprofit grant proposal requiring mission statement, budget breakdown, beneficiary demographics, and measurable outcomes plan.',
      tags: ['Nonprofit', 'Proposal']
    }
  ];

  function init(wrapper) {
    // Navigation
    wrapper.querySelector('#btn-back').addEventListener('click', () => history.back());
    wrapper.querySelector('#btn-home').addEventListener('click', () => {
      navigateTo(getHomeScreenForUser());
    });
    wrapper.querySelector('#btn-login')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelector('#btn-profile')?.addEventListener('click', () => navigateTo('accounts'));

    // Render grid
    const grid = wrapper.querySelector('#examples-grid');

    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      orange: 'bg-orange-50 text-orange-600 border-orange-100',
      rose: 'bg-rose-50 text-rose-600 border-rose-100',
      sky: 'bg-sky-50 text-sky-600 border-sky-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-100',
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
      yellow: 'bg-amber-50 text-amber-600 border-amber-100'
    };

    grid.innerHTML = demos.map(demo => `
      <div class="demo-card bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col" data-url="${demo.url}" role="button" tabindex="0" aria-label="Use demo: ${demo.title}">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center justify-center size-12 rounded-xl border ${colorClasses[demo.color]} shadow-sm scale-100 group-hover:scale-110 transition-transform duration-300">
            <span class="material-symbols-outlined text-2xl">${demo.icon}</span>
          </div>
          <span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1 duration-300">arrow_forward</span>
        </div>
        
        <div class="mb-4 flex-1">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">${demo.company}</p>
          <h3 class="text-lg font-bold text-slate-900 leading-tight mb-2 group-hover:text-primary transition-colors">${demo.title}</h3>
          <p class="text-sm text-slate-500 leading-relaxed">${demo.desc}</p>
        </div>

        <div class="flex items-center gap-2 mb-3 flex-wrap">
          ${(demo.tags || []).map(tag => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">${tag}</span>`).join('')}
          ${demo.fields ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">${demo.fields} fields</span>` : ''}
        </div>

        <div class="px-3 py-2 bg-slate-50 rounded-lg text-xs font-mono text-slate-500 truncate border border-slate-100">
          ${demo.url.startsWith('demo://') ? demo.url : demo.url.replace('https://', '')}
        </div>
      </div>
    `).join('');

    // Attach analysis launch config
    wrapper.querySelectorAll('.demo-card').forEach(card => {
      card.addEventListener('click', () => {
        setState({ formUrl: card.dataset.url });
        navigateTo('analyzing');
      });
      card.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        card.click();
      });
    });
  }

  return { html, init };
}
