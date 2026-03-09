import { setState } from '../state.js';
import { navigateTo } from '../router.js';

export function examplesScreen() {
  const html = `
    <div class="min-h-screen w-full bg-mesh flex flex-col">
      
      <!-- Header -->
      <header class="h-16 border-b border-slate-200 flex items-center px-6 md:px-12 sticky top-0 z-50 glass">
        <button id="btn-back" class="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm btn-press">
          <span class="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </button>
        <div class="flex-1"></div>
        <div class="flex items-center gap-2 btn-press cursor-pointer" id="btn-home">
          <div class="size-8 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
          </div>
          <span class="font-bold text-lg tracking-tighter text-slate-900">Form<span class="text-primary">Mate</span></span>
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
      url: 'https://lever.co/creativesync/senior-product-designer',
      desc: 'Standard tech job application with robust portfolio linking, experience questions, and cover letter inputs.'
    },
    {
      id: 'mortgage-app',
      title: 'Mortgage Pre-Approval',
      company: 'Chase Bank',
      icon: 'real_estate_agent',
      color: 'emerald',
      url: 'https://chase.com/mortgage/apply/preapproval',
      desc: 'Complex financial form containing income data, property details, and sensitive personal identification.'
    },
    {
      id: 'travel-visa',
      title: 'Schengen Visa Request',
      company: 'Gov.Travel',
      icon: 'flight_takeoff',
      color: 'indigo',
      url: 'https://gov.travel/visa-application/schengen',
      desc: 'International government document requiring passport details, travel itinerary, and deep personal history.'
    },
    {
      id: 'rental-lease',
      title: 'Apartment Lease Application',
      company: 'Zillow Rentals',
      icon: 'apartment',
      color: 'orange',
      url: 'https://zillow.com/renter-hub/application/10432',
      desc: 'Residential history check, employment verification, and reference contacts for renting an apartment.'
    },
    {
      id: 'medical-intake',
      title: 'New Patient Intake Form',
      company: 'Sutter Health',
      icon: 'medical_services',
      color: 'rose',
      url: 'https://sutterhealth.org/patient-intake/new',
      desc: 'Lengthy health history form logging prior conditions, surgical histories, allergies, and emergency contacts.'
    },
    {
      id: 'auto-insurance',
      title: 'Auto Insurance Quote',
      company: 'Geico',
      icon: 'directions_car',
      color: 'sky',
      url: 'https://geico.com/quote/auto/start',
      desc: 'Vehicle identification, driving history logs, and background reporting metrics for an insurance quote.'
    },
    {
      id: 'college-app',
      title: 'Undergraduate Admission',
      company: 'Common App',
      icon: 'school',
      color: 'purple',
      url: 'https://commonapp.org/apply/university-of-michigan',
      desc: 'Extensive educational history, extracurricular profiling, and targeted essay question responses.'
    },
    {
      id: 'b2b-saas',
      title: 'Enterprise Demo Request',
      company: 'Salesforce',
      icon: 'business_center',
      color: 'slate',
      url: 'https://salesforce.com/form/demo-request',
      desc: 'B2B lead generation form asking for company size, use-case metrics, and detailed technical qualifications.'
    },
    {
      id: 'feedback-survey',
      title: 'Post-Purchase Survey',
      company: 'Nike',
      icon: 'reviews',
      color: 'yellow',
      url: 'https://nike.feedback.com/order/99341',
      desc: 'Dynamic customer satisfaction survey parsing open-ended sentiment questions based on a recent order.'
    }
  ];

  function init(wrapper) {
    // Navigation
    wrapper.querySelector('#btn-back').addEventListener('click', () => history.back());
    wrapper.querySelector('#btn-home').addEventListener('click', () => navigateTo('landing'));

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
      <div class="demo-card bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col" data-url="${demo.url}">
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

        <div class="px-3 py-2 bg-slate-50 rounded-lg text-xs font-mono text-slate-500 truncate border border-slate-100">
          ${demo.url.replace('https://', '')}
        </div>
      </div>
    `).join('');

    // Attach analysis launch config
    wrapper.querySelectorAll('.demo-card').forEach(card => {
      card.addEventListener('click', () => {
        setState({ formUrl: card.dataset.url });
        navigateTo('analyzing');
      });
    });
  }

  return { html, init };
}
