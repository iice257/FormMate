// @ts-nocheck
import { getState } from '../state';
import { getDashboardActionScreenForUser, navigateTo } from '../router';
import { openAccountModal } from '../components/layout';
import { escapeAttr, escapeHtml, safeHttpUrl } from '../utils/escape';

export function notFoundScreen() {
  const { isAuthenticated, userProfile } = getState();
  const displayFirstName = escapeHtml(userProfile?.name?.split(' ')[0] || 'User');
  const avatarFromProfile = safeHttpUrl(userProfile?.avatar);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=2298da&color=fff&bold=true`;
  const avatarSrc = avatarFromProfile || fallbackAvatar;
  const primaryNavHtml = isAuthenticated
    ? `<button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-dashboard">Dashboard</button>`
    : `<button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-home">Home</button>`;
  const authButtonHtml = isAuthenticated
    ? `<button id="btn-profile" class="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-900 text-sm font-bold pl-2 pr-4 py-1.5 rounded-full transition-all shadow-sm btn-press border border-slate-200">
         <img src="${escapeAttr(avatarSrc)}" class="size-7 rounded-full object-cover border border-slate-200" alt="Avatar" />
         <span class="truncate max-w-[100px]">${displayFirstName}</span>
       </button>`
    : `<button class="bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 btn-press" id="btn-login">Sign In</button>`;

  const html = `
    <div class="not-found-page relative flex min-h-screen w-full flex-col overflow-hidden bg-mesh">
      <header data-fm-hide-on-scroll="true" class="landing-header flex items-center justify-between px-6 py-6 md:px-12 lg:px-24 sticky top-0 z-50 transition-all">
        <div class="flex-1 flex items-center justify-start">
          <button type="button" class="flex min-w-0 items-center gap-2.5 btn-press cursor-pointer bg-transparent border-0 p-0 overflow-visible leading-none" id="btn-logo-home" aria-label="Go to home">
            <div class="size-10 flex shrink-0 items-center justify-center">
              <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
            </div>
            <h2 class="text-slate-900 text-2xl font-black tracking-tighter leading-none overflow-visible" style="font-family: var(--fm-font-sans)">Form<span class="text-primary">Mate</span></h2>
          </button>
        </div>

        <nav class="landing-top-nav hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-full px-2.5 py-2 text-[15px] font-bold text-slate-500">
          ${primaryNavHtml}
          <button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-examples">Examples</button>
          <button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-docs">Docs &amp; Help</button>
          <button type="button" class="px-6 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer" id="nav-terms">Terms</button>
        </nav>

        <div class="flex-1 flex items-center justify-end gap-3">
          ${authButtonHtml}
        </div>
      </header>

      <main class="not-found-main relative isolate flex flex-1 items-center justify-center px-6 pb-16 pt-8">
        <div class="not-found-logo-ghost" aria-hidden="true">
          <img src="/logo.png" alt="" />
        </div>
        <div class="not-found-path not-found-path-left" aria-hidden="true"></div>
        <div class="not-found-path not-found-path-right" aria-hidden="true"></div>

        <div class="not-found-chip not-found-chip-left" aria-hidden="true">
          <span class="material-symbols-outlined">frame_inspect</span>
          Field detected
        </div>
        <div class="not-found-chip not-found-chip-top" aria-hidden="true">
          <span class="material-symbols-outlined">check_circle</span>
          Data parsed
        </div>
        <div class="not-found-chip not-found-chip-right" aria-hidden="true">
          <span class="material-symbols-outlined">auto_awesome</span>
          AI validated
        </div>

        <section class="not-found-stage" aria-label="Page not found">
          <div class="not-found-badge">
            <span></span>
            Lost in the form flow
          </div>
          <h1 class="not-found-code">404</h1>
          <div class="not-found-form-plane" aria-hidden="true">
            <div class="not-found-plane-bar">
              <span></span><span></span><span></span>
            </div>
            <div class="not-found-plane-body">
              <div class="not-found-dropzone">
                <span class="material-symbols-outlined">data_object</span>
                <b>!</b>
              </div>
              <div class="not-found-lines">
                <span></span>
                <span></span>
                <span></span>
                <i></i>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;

  function init(wrapper) {
    wrapper.querySelector('#btn-logo-home')?.addEventListener('click', () => navigateTo(isAuthenticated ? getDashboardActionScreenForUser() : 'landing'));
    wrapper.querySelector('#nav-home')?.addEventListener('click', () => navigateTo('landing'));
    wrapper.querySelector('#nav-dashboard')?.addEventListener('click', () => navigateTo(getDashboardActionScreenForUser()));
    wrapper.querySelector('#nav-examples')?.addEventListener('click', () => navigateTo('examples'));
    wrapper.querySelector('#nav-docs')?.addEventListener('click', () => navigateTo('docs'));
    wrapper.querySelector('#nav-terms')?.addEventListener('click', () => navigateTo('terms'));
    wrapper.querySelector('#btn-login')?.addEventListener('click', () => navigateTo('auth'));
    wrapper.querySelector('#btn-profile')?.addEventListener('click', () => openAccountModal('profile'));
  }

  return { html, init };
}
