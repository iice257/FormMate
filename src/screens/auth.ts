// @ts-nocheck

import { getState, setState } from '../state';
import { getDashboardActionScreenForUser, navigateTo } from '../router';
import { getAuthErrorMessage, getDevTestUsers, resendOtpSignUp, resetPassword, signIn, signInWithDevTestUser, signInWithGoogle, signInWithGoogleCredential, startOtpSignUp, verifyOtpSignUp } from '../auth/auth-service';
import { promptGoogleOneTap } from '../auth/google-one-tap';
import { isOnboardingComplete } from '../storage/local-store';
import { toast } from '../components/toast';
import { escapeHtml } from '../utils/escape';

export function authScreen() {
  const devTestUsers = getDevTestUsers();
  const devAccessHtml = devTestUsers.length ? `
            <div class="mt-5 rounded-2xl p-4" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated);">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold" style="color: var(--fm-text);">Dev test access</p>
                  <p class="text-xs mt-1" style="color: var(--fm-text-tertiary);">Available only in local development. Uses the shared test account from auth service.</p>
                </div>
                <span class="text-[10px] font-semibold uppercase tracking-[0.18em] px-2 py-1 rounded-full" style="background: var(--fm-primary-soft); color: var(--fm-primary);">Dev only</span>
              </div>
              <div class="mt-3 space-y-2">
                ${devTestUsers.map((user) => `
                  <button
                    type="button"
                    class="w-full rounded-xl px-4 py-3 text-left transition-colors btn-press"
                    data-dev-test-user="${user.id}"
                    style="border: 1px solid var(--fm-border); background: var(--fm-surface); color: var(--fm-text);"
                  >
                    <span class="block text-sm font-semibold">${escapeHtml(user.name)}</span>
                    <span class="block text-xs mt-1" style="color: var(--fm-text-tertiary);">${escapeHtml(user.email)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : '';

  const html = `
    <div class="relative flex min-h-screen w-full bg-mesh auth-shell">
      <div class="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden ring-1 ring-primary/20 bg-[#0d1017] auth-hero-panel">
        <div class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-100" style="background-image: url('/auth-bg-image.png');"></div>
        <div class="absolute inset-0 z-10 pointer-events-none rounded-br-2xl shadow-[inset_0_0_0_1px_rgba(91,155,255,0.2)]"></div>

        <div class="relative z-20 flex w-full flex-col h-full auth-hero-copy">
          <div class="flex items-center gap-3 self-start">
            <div class="size-10 flex shrink-0 items-center justify-center">
              <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
            </div>
            <h2 class="text-[2rem] font-black tracking-tighter text-white">Form<span class="auth-hero-mate-solid">Mate</span></h2>
          </div>

          <div class="w-full max-w-[28rem] px-4 lg:mt-72 xl:mt-56 lg:-ml-5 xl:ml-0 lg:max-w-[24rem] xl:max-w-[28rem]">
            <h1 class="text-white text-6xl xl:text-[5.5rem] font-extrabold leading-[1.05] tracking-tight">
              Fill forms with<br/><span class="text-link-gradient animate-gradient-x">AI magic.</span>
            </h1>
          </div>
        </div>
      </div>

      <div class="flex-1 flex items-center justify-center px-6 py-12 auth-form-shell">
        <div class="w-full max-w-[420px] auth-form-panel">
          <div class="lg:hidden relative mb-6 h-52 sm:h-56 md:h-64 overflow-hidden rounded-2xl ring-1 ring-primary/20 bg-[#0d1017]">
            <div class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100" style="background-image: url('/auth-bg-image.png');"></div>
            <div class="absolute inset-0 bg-black/25"></div>
            <div class="relative z-10 h-full flex items-center px-5 sm:px-6 md:px-7">
              <p class="max-w-[18rem] sm:max-w-[20rem] text-white text-[2.1rem] sm:text-[2.5rem] md:text-[2.8rem] font-extrabold leading-[1.08] tracking-tight">
                Fill forms with <span class="text-link-gradient animate-gradient-x">AI magic.</span>
              </p>
            </div>
          </div>
          <div class="lg:hidden flex items-center gap-3 mb-10">
            <div class="size-10 flex shrink-0 items-center justify-center">
              <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
            </div>
            <h2 class="text-xl font-black tracking-tighter" style="color: var(--fm-text);">Form<span class="text-primary">Mate</span></h2>
          </div>

          <form id="login-form" novalidate>
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Continue to FormMate</h2>
            <p class="text-sm mb-8" style="color: var(--fm-text-tertiary);">Please sign in or register to proceed.</p>

            <div class="space-y-4">
              <div>
                <label for="login-email" class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Email</label>
                <input id="login-email" name="email" type="email" autocomplete="email" required class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="you@example.com" />
              </div>
              <div>
                <label for="login-password" class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Password</label>
                <input id="login-password" name="password" type="password" autocomplete="current-password" required class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="Enter password" />
              </div>

              <div class="flex justify-end">
                <button type="button" id="btn-forgot" class="text-xs font-semibold hover:underline transition-colors" style="color: var(--fm-primary);">Forgot password?</button>
              </div>

              <button type="submit" id="btn-login" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press flex items-center justify-center gap-2" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
                Sign In
                <span class="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <div id="login-error" class="hidden text-xs font-medium text-center p-3 rounded-lg" role="alert" aria-live="polite" style="background: var(--fm-error-light); color: var(--fm-error);"></div>
            </div>

            <div class="flex items-center gap-4 my-6">
              <div class="flex-1 h-px" style="background: var(--fm-border);"></div>
              <span class="text-xs font-medium" style="color: var(--fm-text-tertiary);">or continue with</span>
              <div class="flex-1 h-px" style="background: var(--fm-border);"></div>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <button type="button" id="btn-google" class="h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors btn-press" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);">
                <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
            </div>

            <p class="text-center text-xs mt-6" style="color: var(--fm-text-tertiary);">
              Don't have an account? <button type="button" id="btn-to-signup" class="font-semibold hover:underline" style="color: var(--fm-primary);">Create one</button>
            </p>
            ${devAccessHtml}
          </form>

          <form id="signup-form" class="hidden" novalidate>
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Create account</h2>
            <p class="text-sm mb-8" style="color: var(--fm-text-tertiary);">Get started with FormMate in seconds. We will verify your email with a secure one-time code.</p>

            <div class="space-y-4">
              <div>
                <label for="signup-name" class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Full Name</label>
                <input id="signup-name" name="name" type="text" autocomplete="name" class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="John Doe" />
              </div>
              <div>
                <label for="signup-email" class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Email</label>
                <input id="signup-email" name="email" type="email" autocomplete="email" required class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="you@example.com" />
              </div>
              <div>
                <label for="signup-password" class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Password</label>
                <input id="signup-password" name="password" type="password" autocomplete="new-password" required class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="Min. 6 characters" />
              </div>

              <button type="submit" id="btn-signup" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press flex items-center justify-center gap-2" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
                Create Account
                <span class="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <div id="signup-error" class="hidden text-xs font-medium text-center p-3 rounded-lg" role="alert" aria-live="polite" style="background: var(--fm-error-light); color: var(--fm-error);"></div>
            </div>

            <p class="text-center text-xs mt-6" style="color: var(--fm-text-tertiary);">
              Already have an account? <button type="button" id="btn-to-login" class="font-semibold hover:underline" style="color: var(--fm-primary);">Sign in</button>
            </p>
          </form>

          <form id="otp-form" class="hidden" novalidate>
            <button type="button" id="btn-back-signup" class="flex items-center gap-1 text-xs font-semibold mb-6 hover:underline" style="color: var(--fm-primary);">
              <span class="material-symbols-outlined text-sm">arrow_back</span> Back to account details
            </button>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5" style="background: var(--fm-primary-50); color: var(--fm-primary); border: 1px solid rgba(var(--fm-primary-rgb), 0.16);">
              <span class="material-symbols-outlined text-sm">mark_email_read</span>
              <span class="text-[10px] font-black uppercase tracking-[0.16em]">Email Verification</span>
            </div>
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Enter your code</h2>
            <p class="text-sm mb-6" style="color: var(--fm-text-tertiary);">
              We sent a 6-digit code to <strong id="otp-email-label" style="color: var(--fm-text);"></strong>.
            </p>

            <div class="space-y-5">
              <div class="grid grid-cols-6 gap-2" id="otp-code-group" aria-label="Verification code">
                ${Array.from({ length: 6 }, (_, index) => `
                  <input
                    id="otp-code-${index}"
                    class="otp-code-input h-13 rounded-xl text-center text-lg font-black"
                    inputmode="numeric"
                    autocomplete="${index === 0 ? 'one-time-code' : 'off'}"
                    maxlength="1"
                    pattern="[0-9]*"
                    aria-label="Verification code digit ${index + 1}"
                    style="height: 3.25rem; border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);"
                  />
                `).join('')}
              </div>

              <button type="submit" id="btn-verify-otp" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press flex items-center justify-center gap-2" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
                Verify & Continue
                <span class="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              <div id="otp-error" class="hidden text-xs font-medium text-center p-3 rounded-lg" role="alert" aria-live="polite" style="background: var(--fm-error-light); color: var(--fm-error);"></div>
            </div>

            <p class="text-center text-xs mt-6" style="color: var(--fm-text-tertiary);">
              Did not get it?
              <button type="button" id="btn-resend-otp" class="font-semibold hover:underline" style="color: var(--fm-primary);">Send a new code</button>
            </p>
          </form>

          <form id="forgot-form" class="hidden" novalidate>
            <button type="button" id="btn-back-login" class="flex items-center gap-1 text-xs font-semibold mb-6 hover:underline" style="color: var(--fm-primary);">
              <span class="material-symbols-outlined text-sm">arrow_back</span> Back to login
            </button>
            <h2 class="text-3xl font-extrabold tracking-tight mb-2" style="color: var(--fm-text);">Reset password</h2>
            <p class="text-sm mb-8" style="color: var(--fm-text-tertiary);">Enter your email to receive a reset link</p>

            <div class="space-y-4">
              <div>
                <label for="forgot-email" class="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style="color: var(--fm-text-secondary);">Email</label>
                <input id="forgot-email" name="email" type="email" autocomplete="email" required class="w-full h-12 px-4 rounded-xl text-sm" style="border: 1px solid var(--fm-border); background: var(--fm-bg-elevated); color: var(--fm-text);" placeholder="you@example.com" />
              </div>

              <button type="submit" id="btn-reset" class="w-full h-12 rounded-xl text-sm font-bold text-white btn-press" style="background: var(--fm-gradient-primary); box-shadow: var(--fm-shadow-primary);">
                Send Reset Link
              </button>

              <div id="forgot-message" class="hidden text-xs font-medium text-center p-3 rounded-lg" role="status" aria-live="polite"></div>
            </div>
          </form>

          <div class="mt-8 text-center">
            <button type="button" id="btn-skip-auth" class="text-xs font-medium hover:underline" style="color: var(--fm-text-tertiary);">
              Skip for now &rarr;</button>
          </div>
        </div>
      </div>
    </div>
  `;

  function init(wrapper) {
    const loginForm = wrapper.querySelector('#login-form');
    const signupForm = wrapper.querySelector('#signup-form');
    const otpForm = wrapper.querySelector('#otp-form');
    const forgotForm = wrapper.querySelector('#forgot-form');
    const otpEmailLabel = wrapper.querySelector('#otp-email-label');
    const otpInputs = Array.from(wrapper.querySelectorAll('.otp-code-input'));
    let pendingOtpSignup = null;

    const showForm = (targetForm) => {
      loginForm.classList.toggle('hidden', targetForm !== loginForm);
      signupForm.classList.toggle('hidden', targetForm !== signupForm);
      otpForm.classList.toggle('hidden', targetForm !== otpForm);
      forgotForm.classList.toggle('hidden', targetForm !== forgotForm);
    };

    wrapper.querySelector('#btn-to-signup').addEventListener('click', () => {
      showForm(signupForm);
    });
    wrapper.querySelector('#btn-to-login').addEventListener('click', () => showForm(loginForm));
    wrapper.querySelector('#btn-forgot').addEventListener('click', () => {
      showForm(forgotForm);
    });
    wrapper.querySelector('#btn-back-login').addEventListener('click', () => showForm(loginForm));
    wrapper.querySelector('#btn-back-signup').addEventListener('click', () => showForm(signupForm));

    const applySessionState = (session) => {
      const user = session.user;
      setState({
        isAuthenticated: true,
        authUser: user,
        userProfile: {
          ...getState().userProfile,
          name: user.name || '',
          email: user.email || '',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=2298da&color=fff&bold=true`
        }
      });
    };

    const completeAuthFlow = (session, successMessage) => {
      applySessionState(session);
      toast.success(successMessage);
      navigateAfterAuth();
    };

    void promptGoogleOneTap({
      autoSelect: false,
      context: 'signin',
      onCredential: async (response, { nonce } = {}) => {
        try {
          const session = await signInWithGoogleCredential(response, { nonce });
          if (!wrapper.isConnected) return;
          completeAuthFlow(session, 'Welcome to FormMate.');
        } catch (err) {
          console.warn('[Auth] Google One Tap sign-in failed:', err);
        }
      },
      onPromptMoment: (notification) => {
        if (notification?.skipped || notification?.dismissed || notification?.displayReason) {
          console.info('[Auth] Google One Tap prompt state:', notification);
        }
      },
    }).catch((error) => {
      console.warn('[Auth] Google One Tap unavailable:', error);
    });

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
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
        completeAuthFlow(session, 'Welcome back, ' + (session.user.name || session.user.email) + '!');
      } catch (err) {
        console.warn('[Auth] Email sign-in failed:', err);
        showError(errorEl, getAuthErrorMessage(err));
        btn.disabled = false;
        btn.innerHTML = 'Sign In <span class="material-symbols-outlined text-lg">arrow_forward</span>';
      }
    });

    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
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
      btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Sending code...';

      try {
        await startOtpSignUp(email, password, name);
        pendingOtpSignup = { email, password, name };
        if (otpEmailLabel) otpEmailLabel.textContent = email;
        otpInputs.forEach((input) => { input.value = ''; });
        showForm(otpForm);
        otpInputs[0]?.focus();
        toast.success('Verification code sent.');
      } catch (err) {
        console.warn('[Auth] Signup OTP start failed:', err);
        showError(errorEl, getAuthErrorMessage(err));
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create Account <span class="material-symbols-outlined text-lg">arrow_forward</span>';
      }
    });

    const getOtpCode = () => otpInputs.map((input) => input.value || '').join('').replace(/\D/g, '');
    const fillOtpCode = (value) => {
      const digits = String(value || '').replace(/\D/g, '').slice(0, 6).split('');
      otpInputs.forEach((input, index) => {
        input.value = digits[index] || '';
      });
      otpInputs[Math.min(digits.length, 5)]?.focus();
    };

    otpInputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '');
        if (digits.length > 1) {
          fillOtpCode(digits);
          return;
        }
        input.value = digits;
        if (digits && index < otpInputs.length - 1) {
          otpInputs[index + 1]?.focus();
        }
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && index > 0) {
          otpInputs[index - 1]?.focus();
        }
      });

      input.addEventListener('paste', (event) => {
        const text = event.clipboardData?.getData('text/plain') || '';
        if (!/\d/.test(text)) return;
        event.preventDefault();
        fillOtpCode(text);
      });
    });

    otpForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = wrapper.querySelector('#otp-error');
      const btn = wrapper.querySelector('#btn-verify-otp');
      const code = getOtpCode();

      if (!pendingOtpSignup?.email) {
        showError(errorEl, 'Please restart account creation.');
        showForm(signupForm);
        return;
      }

      if (code.length !== 6) {
        showError(errorEl, 'Enter the 6-digit verification code.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Verifying...';

      try {
        const session = await verifyOtpSignUp(pendingOtpSignup.email, code, {
          password: pendingOtpSignup.password,
          name: pendingOtpSignup.name,
        });
        pendingOtpSignup = null;
        completeAuthFlow(session, 'Account verified. Welcome to FormMate.');
      } catch (err) {
        console.warn('[Auth] Signup OTP verification failed:', err);
        showError(errorEl, getAuthErrorMessage(err, 'Verification failed. Please try again.'));
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Verify & Continue <span class="material-symbols-outlined text-lg">arrow_forward</span>';
      }
    });

    wrapper.querySelector('#btn-resend-otp').addEventListener('click', async () => {
      const btn = wrapper.querySelector('#btn-resend-otp');
      const errorEl = wrapper.querySelector('#otp-error');
      const originalText = btn.textContent;

      if (!pendingOtpSignup?.email) {
        showError(errorEl, 'Please restart account creation.');
        showForm(signupForm);
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Sending...';
        await resendOtpSignUp(pendingOtpSignup.email, pendingOtpSignup.name);
        otpInputs.forEach((input) => { input.value = ''; });
        otpInputs[0]?.focus();
        toast.success('New verification code sent.');
      } catch (err) {
        console.warn('[Auth] Signup OTP resend failed:', err);
        showError(errorEl, getAuthErrorMessage(err, 'Could not resend the code.'));
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });

    forgotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
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
        console.warn('[Auth] Password reset failed:', err);
        msgEl.textContent = getAuthErrorMessage(err, 'Password reset is temporarily unavailable.');
        msgEl.classList.remove('hidden');
      }
    });

    wrapper.querySelector('#btn-google').addEventListener('click', async () => {
      const errorEl = wrapper.querySelector('#login-error');
      const btn = wrapper.querySelector('#btn-google');
      const originalHtml = btn.innerHTML;

      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Redirecting...';
        await signInWithGoogle();
      } catch (err) {
        console.warn('[Auth] Google sign-in failed:', err);
        showError(errorEl, getAuthErrorMessage(err, 'Google sign-in is temporarily unavailable. Please use email sign-in for now.'));
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    wrapper.querySelectorAll('[data-dev-test-user]').forEach((button) => {
      button.addEventListener('click', async () => {
        const errorEl = wrapper.querySelector('#login-error');
        const originalHtml = button.innerHTML;

        try {
          button.disabled = true;
          button.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Signing in...';
          const session = await signInWithDevTestUser(button.dataset.devTestUser);
          completeAuthFlow(session, `Signed in as ${session.user.name || 'Dev user'}.`);
        } catch (err) {
          console.warn('[Auth] Dev sign-in failed:', err);
          showError(errorEl, getAuthErrorMessage(err, 'Dev sign-in failed.'));
          button.disabled = false;
          button.innerHTML = originalHtml;
        }
      });
    });

    wrapper.querySelector('#btn-skip-auth').addEventListener('click', () => {
      setState({ isAuthenticated: false });
      navigateTo('landing');
    });
  }

  return { html, init };
}

function navigateAfterAuth() {
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
