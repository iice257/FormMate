// @ts-nocheck
// ═══════════════════════════════════════════
// FormMate — Auth Screen
// ═══════════════════════════════════════════

import { getState, setState } from '../state';
import { getDashboardActionScreenForUser, navigateTo } from '../router';
import { signUp, signIn, signInWithGoogle, resetPassword } from '../auth/auth-service';
import { isOnboardingComplete } from '../storage/local-store';
import { toast } from '../components/toast';

export function authScreen() {
  const devAccessHtml = '';

  const html = `
    <div class="relative flex min-h-screen w-full bg-mesh">
      <!-- Left decorative panel (desktop) -->
      <div class="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden ring-1 ring-primary/20 bg-[#0d1017]">
        <!-- Holographic AI background -->
        <div class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-90" style="background-image: url('/login-bg.png');"></div>

        <!-- Inward gradient border/stroke effect seen in mockup -->
        <div class="absolute inset-0 z-10 pointer-events-none rounded-br-2xl shadow-[inset_0_0_0_1px_rgba(91,155,255,0.2)]"></div>

        <!-- Dark blur cloud behind text for contrast -->
        <div class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div class="w-[110%] h-[50%] bg-black/40 blur-[80px] rounded-[100%] rounded-full"></div>
        </div>

        <div class="relative z-20 flex w-full items-center justify-center px-4">
          <h1 class="text-white text-6xl xl:text-[5.5rem] font-extrabold leading-[1.1] tracking-tight text-center">
            Fill forms with<br/>AI magic.
          </h1>
        </div>
      </div>

      <!-- Right form panel -->
      <div class="flex-1 flex items-center justify-center px-6 py-12">
        <div class="w-full max-w-[420px]">
          <!-- Mobile logo -->
          <div class="lg:hidden flex items-center gap-3 mb-10">
            <div class="size-10 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
            </div>
            <h2 class="text-xl font-black tracking-tighter" style="color: var(--fm-text);">Form<span class="text-primary">Mate</span></h2>
          </div>

          <!-- Login Form (default) -->
          <div id="login-form">
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Continue to FormMate</h2>
            <p class="text-sm mb-8" style="color: var(--fm-text-tertiary);">Please sign in or register to proceed.</p>

            <div class="space-y-4">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Email</label>
                <input id="login-email" type="email" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="you@example.com" />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Password</label>
                <input id="login-password" type="password" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="••••••••" />
              </div>

              <div class="flex justify-end">
                <button id="btn-forgot" class="text-xs font-semibold hover:underline transition-colors" style="color: var(--fm-primary);">Forgot password?</button>
              </div>

              <button id="btn-login" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press flex items-center justify-center gap-2" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
                Sign In
                <span class="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <div id="login-error" class="hidden text-xs font-medium text-center p-3 rounded-lg" style="background: var(--fm-error-light); color: var(--fm-error);"></div>
            </div>

            <!-- Divider -->
            <div class="flex items-center gap-4 my-6">
              <div class="flex-1 h-px" style="background: var(--fm-border);"></div>
              <span class="text-xs font-medium" style="color: var(--fm-text-tertiary);">or continue with</span>
              <div class="flex-1 h-px" style="background: var(--fm-border);"></div>
            </div>

            <!-- Social Login -->
            <div class="grid grid-cols-1 gap-3">
              <button id="btn-google" class="h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors btn-press" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);">
                <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
            </div>



            <p class="text-center text-xs mt-6" style="color: var(--fm-text-tertiary);">
              Don't have an account? <button id="btn-to-signup" class="font-semibold hover:underline" style="color: var(--fm-primary);">Create one</button>
            </p>
            ${devAccessHtml}
          </div>

          <!-- Signup Form (hidden) -->
          <div id="signup-form" class="hidden">
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Create account</h2>
            <p class="text-sm mb-8" style="color: var(--fm-text-tertiary);">Get started with FormMate in seconds</p>

            <div class="space-y-4">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Full Name</label>
                <input id="signup-name" type="text" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="John Doe" />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Email</label>
                <input id="signup-email" type="email" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="you@example.com" />
              </div>
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Password</label>
                <input id="signup-password" type="password" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="Min. 6 characters" />
              </div>

              <button id="btn-signup" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press flex items-center justify-center gap-2" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
                Create Account
                <span class="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <div id="signup-error" class="hidden text-xs font-medium text-center p-3 rounded-lg" style="background: var(--fm-error-light); color: var(--fm-error);"></div>
            </div>

            <p class="text-center text-xs mt-6" style="color: var(--fm-text-tertiary);">
              Already have an account? <button id="btn-to-login" class="font-semibold hover:underline" style="color: var(--fm-primary);">Sign in</button>
            </p>
          </div>

          <!-- Forgot Password Form (hidden) -->
          <div id="forgot-form" class="hidden">
            <button id="btn-back-login" class="flex items-center gap-1 text-xs font-semibold mb-6 hover:underline" style="color: var(--fm-primary);">
              <span class="material-symbols-outlined text-sm">arrow_back</span> Back to login
            </button>
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Reset password</h2>
            <p class="text-sm mb-8" style="color: var(--fm-text-tertiary);">Enter your email to receive a reset link</p>

            <div class="space-y-4">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Email</label>
                <input id="forgot-email" type="email" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="you@example.com" />
              </div>

              <button id="btn-reset" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
                Send Reset Link
              </button>

              <div id="forgot-message" class="hidden text-xs font-medium text-center p-3 rounded-lg"></div>
            </div>
          </div>

          <!-- Skip auth -->
          <div class="mt-8 text-center">
            <button id="btn-skip-auth" class="text-xs font-medium hover:underline" style="color: var(--fm-text-tertiary);">
              Skip for now →
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  function init(wrapper) {
    // Elements
    const loginForm = wrapper.querySelector('#login-form');
    const signupForm = wrapper.querySelector('#signup-form');
    const forgotForm = wrapper.querySelector('#forgot-form');

    // Toggle forms
    wrapper.querySelector('#btn-to-signup').addEventListener('click', () => {
      loginForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      forgotForm.classList.add('hidden');
    });

    wrapper.querySelector('#btn-to-login').addEventListener('click', () => {
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      forgotForm.classList.add('hidden');
    });

    wrapper.querySelector('#btn-forgot').addEventListener('click', () => {
      loginForm.classList.add('hidden');
      signupForm.classList.add('hidden');
      forgotForm.classList.remove('hidden');
    });

    wrapper.querySelector('#btn-back-login').addEventListener('click', () => {
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      forgotForm.classList.add('hidden');
    });

    const applySessionState = (session) => {
      const user = session.user;
      setState({
        isAuthenticated: true,
        authUser: user,
        tier: user.tier || 'free',
        userProfile: {
          ...getState().userProfile,
          name: user.name || '',
          email: user.email || '',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=2298da&color=fff&bold=true`
        }
      });
    };

    // Login
    wrapper.querySelector('#btn-login').addEventListener('click', async () => {
      const email = wrapper.querySelector('#login-email').value.trim();
      const password = wrapper.querySelector('#login-password').value;
      const errorEl = wrapper.querySelector('#login-error');
      const btn = wrapper.querySelector('#btn-login');

      if (!email || !password) {
        showError(errorEl, 'Please fill in all fields.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Signing in...';

      try {
        const session = await signIn(email, password);
        applySessionState(session);
        toast.success('Welcome back, ' + (session.user.name || session.user.email) + '!');
        navigateAfterAuth();
      } catch (err) {
        showError(errorEl, err.message);
        btn.disabled = false;
        btn.innerHTML = 'Sign In <span class="material-symbols-outlined text-lg">arrow_forward</span>';
      }
    });



    // Signup
    wrapper.querySelector('#btn-signup').addEventListener('click', async () => {
      const name = wrapper.querySelector('#signup-name').value.trim();
      const email = wrapper.querySelector('#signup-email').value.trim();
      const password = wrapper.querySelector('#signup-password').value;
      const errorEl = wrapper.querySelector('#signup-error');
      const btn = wrapper.querySelector('#btn-signup');

      if (!email || !password) {
        showError(errorEl, 'Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        showError(errorEl, 'Password must be at least 6 characters.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Creating...';

      try {
        const session = await signUp(email, password, name);
        applySessionState(session);
        toast.success('Account created! Welcome to FormMate.');
        navigateAfterAuth();
      } catch (err) {
        showError(errorEl, err.message);
        btn.disabled = false;
        btn.innerHTML = 'Create Account <span class="material-symbols-outlined text-lg">arrow_forward</span>';
      }
    });

    // Forgot password
    wrapper.querySelector('#btn-reset').addEventListener('click', async () => {
      const email = wrapper.querySelector('#forgot-email').value.trim();
      const msgEl = wrapper.querySelector('#forgot-message');

      if (!email) {
        msgEl.style.background = 'var(--fm-error-light)';
        msgEl.style.color = 'var(--fm-error)';
        msgEl.textContent = 'Please enter your email.';
        msgEl.classList.remove('hidden');
        return;
      }

      try {
        const result = await resetPassword(email);
        msgEl.style.background = 'var(--fm-success-light)';
        msgEl.style.color = 'var(--fm-success)';
        msgEl.textContent = result.message;
        msgEl.classList.remove('hidden');
      } catch (err) {
        msgEl.style.background = 'var(--fm-error-light)';
        msgEl.style.color = 'var(--fm-error)';
        msgEl.textContent = err.message;
        msgEl.classList.remove('hidden');
      }
    });

    // Social login
    wrapper.querySelector('#btn-google').addEventListener('click', async (e) => {
      e.preventDefault();
      const errorEl = wrapper.querySelector('#login-error');
      const btn = wrapper.querySelector('#btn-google');
      const originalHtml = btn.innerHTML;
      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Redirecting...';
        await signInWithGoogle();
      } catch (err) {
        showError(errorEl, err.message || 'Google sign-in failed.');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    // Skip auth
    wrapper.querySelector('#btn-skip-auth').addEventListener('click', () => {
      setState({ isAuthenticated: false });
      navigateTo('landing');
    });

    // Enter key on inputs
    ['#login-email', '#login-password'].forEach(sel => {
      wrapper.querySelector(sel).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') wrapper.querySelector('#btn-login').click();
      });
    });
    ['#signup-name', '#signup-email', '#signup-password'].forEach(sel => {
      wrapper.querySelector(sel).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') wrapper.querySelector('#btn-signup').click();
      });
    });


  }

  return { html, init };
}

function navigateAfterAuth() {
  // If Assisted Capture was completed while unauthenticated, continue the import flow.
  const { capturePayload } = getState();
  if (capturePayload) {
    navigateTo('analyzing');
    return;
  }

  if (!isOnboardingComplete()) {
    navigateTo('onboarding');
  } else {
    navigateTo(getDashboardActionScreenForUser());
  }
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}
