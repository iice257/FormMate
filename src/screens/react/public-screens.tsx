import { useState } from 'react';

import { getState, setState, updateProfile, updateVault } from '@/state';
import { signIn, signInWithGoogle, signUp, resetPassword } from '@/auth/auth-service';
import { normalizeSubmittedFormUrl } from '@/parser/url-intake';
import { isOnboardingComplete, setOnboardingComplete } from '@/storage/local-store';
import { useAppState } from '@/hooks/use-app-state';
import { navigateTo } from '@/router';
import { PublicFrame } from '@/components/public-frame';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function getInputValue(id) {
  return (document.getElementById(id) as HTMLInputElement | null)?.value?.trim() || '';
}

function getTextAreaValue(id) {
  return (document.getElementById(id) as HTMLTextAreaElement | null)?.value?.trim() || '';
}

function setInputValue(id, value) {
  const element = document.getElementById(id) as HTMLInputElement | null;
  if (element) {
    element.value = value;
  }
}

function getAvatarSource(userProfile) {
  if (userProfile?.avatar) return userProfile.avatar;
  const name = userProfile?.name || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2298da&color=fff&bold=true`;
}

function getInitials(value) {
  return String(value || 'User').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

export function LandingScreen({ openAccountModal }) {
  const isAuthenticated = useAppState((state) => state.isAuthenticated);
  const userProfile = useAppState((state) => state.userProfile);
  const [url, setUrl] = useState('');

  const startAnalysis = () => {
    if (!url.trim()) {
      navigateTo(isAuthenticated ? 'new' : 'auth');
      return;
    }
    try {
      const normalized = normalizeSubmittedFormUrl(url, { allowDemo: true });
      setState({ formUrl: normalized });
      navigateTo(isAuthenticated ? 'analyzing' : 'auth');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PublicFrame>
      <header className="flex items-center justify-between gap-4">
        <Button variant="ghost" className="px-0" onClick={() => navigateTo('landing')}>
          <img src="/logo.png" alt="FormMate" className="size-9 rounded-full" />
          <span className="text-lg font-black tracking-tight">FormMate</span>
        </Button>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="outline" onClick={() => openAccountModal('profile')}>
              <Avatar className="size-6">
                <AvatarImage src={getAvatarSource(userProfile)} alt={userProfile?.name || 'User'} />
                <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
              </Avatar>
              {userProfile?.name?.split(' ')[0] || 'Account'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigateTo('auth')}>Sign in</Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 items-center py-10 md:py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-center">
          <div className="space-y-6">
            <Badge variant="secondary">AI-assisted form workspace</Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">Fill forms without rebuilding the same answer every time.</h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">Paste a public form link, map the structure, generate answers with AI, and keep your best responses in a reusable vault.</p>
            </div>
            <Card className="max-w-3xl">
              <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input aria-label="Form URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a form URL or demo://job-application" />
                <Button onClick={startAnalysis}>Analyze form</Button>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigateTo('examples')}>Browse examples</Button>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('pricing')}>See pricing</Button>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('docs')}>Read docs</Button>
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>What the workspace looks like</CardTitle>
              <CardDescription>Structured review instead of a blank screen and endless tabs.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <PreviewRow title="Paste a new link" copy="The parser classifies fields, requirements, and likely answer sources." />
              <PreviewRow title="Review AI answers" copy="Each answer keeps its source label and can be rewritten or regenerated." />
              <PreviewRow title="Save reusable data" copy="Promote good answers into the vault so future forms are faster." />
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicFrame>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState('sign-in');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleSession = (session) => {
    const user = session.user;
    setState({ isAuthenticated: true, authUser: user, tier: user.tier || 'free', userProfile: { ...user, name: user.name || '', email: user.email || '', avatar: user.avatar || '' } });
    if (getState().capturePayload) {
      navigateTo('analyzing');
      return;
    }
    navigateTo(isOnboardingComplete() ? 'dashboard' : 'onboarding');
  };

  const handleAction = async (fn) => {
    setPending(true);
    setError('');
    try {
      const session = await fn();
      if (session) handleSession(session);
    } catch (err) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <PublicFrame>
      <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Badge variant="secondary">Secure account access</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Continue to FormMate.</h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">Sign in to keep vault data, history, and preferences synced to the same workspace.</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Reset password'}</CardTitle>
            <CardDescription>{mode === 'sign-in' ? 'Use your FormMate account or continue with Google.' : mode === 'sign-up' ? 'Create a lightweight account for history and vault storage.' : 'Send yourself a password reset link.'}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {mode === 'sign-up' ? <FieldInput id="signup-name" label="Full name" /> : null}
            <FieldInput id={mode === 'reset' ? 'reset-email' : mode === 'sign-up' ? 'signup-email' : 'auth-email'} label="Email" type="email" />
            {mode !== 'reset' ? <FieldInput id={mode === 'sign-up' ? 'signup-password' : 'auth-password'} label="Password" type="password" /> : null}
            {error ? <Alert variant="destructive"><AlertTitle>Authentication error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {mode === 'sign-in' ? (
              <>
                <Button id="btn-login" className="w-full" disabled={pending} onClick={() => handleAction(() => signIn(getInputValue('login-email'), getInputValue('login-password')))}>Sign in</Button>
                <Button id="btn-google" className="w-full" variant="outline" disabled={pending} onClick={() => handleAction(() => signInWithGoogle())}>Continue with Google</Button>
                <div className="flex w-full items-center justify-between text-sm">
                  <Button variant="link" className="px-0" onClick={() => setMode('reset')}>Forgot password?</Button>
                  <Button id="btn-to-signup" variant="link" className="px-0" onClick={() => setMode('sign-up')}>Create account</Button>
                </div>
              </>
            ) : mode === 'sign-up' ? (
              <>
                <Button id="btn-signup" className="w-full" disabled={pending} onClick={() => handleAction(() => signUp(getInputValue('signup-email'), getInputValue('signup-password'), getInputValue('signup-name')))}>Create account</Button>
                <Button variant="link" className="px-0" onClick={() => setMode('sign-in')}>Already have an account?</Button>
              </>
            ) : (
              <>
                <Button className="w-full" disabled={pending} onClick={() => handleAction(() => resetPassword(getInputValue('reset-email')))}>Send reset link</Button>
                <Button variant="link" className="px-0" onClick={() => setMode('sign-in')}>Back to sign in</Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigateTo('landing')}>Skip for now</Button>
          </CardFooter>
        </Card>
      </div>
    </PublicFrame>
  );
}

export function OnboardingScreen() {
  const authUser = useAppState((state) => state.authUser);
  const [tone, setTone] = useState('professional');

  const finish = () => {
    updateProfile({
      name: getInputValue('ob-name') || authUser?.name || '',
      email: getInputValue('ob-email') || authUser?.email || '',
      occupation: getInputValue('ob-occupation'),
      experience: getInputValue('ob-experience-hidden'),
      phone: getInputValue('ob-phone'),
      bio: getTextAreaValue('ob-bio'),
      preferredTone: tone,
    });
    updateVault('Full Name', getInputValue('ob-name') || authUser?.name || '');
    updateVault('Email Address', getInputValue('ob-email') || authUser?.email || '');
    setOnboardingComplete(true);
    setState({ onboardingComplete: true, personality: tone });
    navigateTo('dashboard');
  };

  return (
    <PublicFrame>
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-8">
        <Card className="w-full">
          <CardHeader>
            <Badge variant="secondary">Optional setup</Badge>
            <CardTitle>Tell FormMate what to reuse.</CardTitle>
            <CardDescription>Capture just enough context to make future form fills faster and more accurate.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FieldInput id="ob-name" label="Name" defaultValue={authUser?.name || ''} />
            <FieldInput id="ob-email" label="Email" type="email" defaultValue={authUser?.email || ''} />
            <FieldInput id="ob-occupation" label="Occupation" />
            <div className="grid gap-2">
              <Label htmlFor="ob-experience">Experience</Label>
              <Select onValueChange={(value) => { setInputValue('ob-experience-hidden', value); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select experience" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="student">Student</SelectItem><SelectItem value="0-2">0-2 years</SelectItem><SelectItem value="3-5">3-5 years</SelectItem><SelectItem value="5-10">5-10 years</SelectItem><SelectItem value="10+">10+ years</SelectItem></SelectGroup></SelectContent>
              </Select>
              <input id="ob-experience-hidden" type="hidden" />
            </div>
            <FieldInput id="ob-phone" label="Phone" />
            <div className="grid gap-2">
              <Label>Preferred tone</Label>
              <RadioGroup value={tone} onValueChange={setTone} className="grid grid-cols-2 gap-3">
                {['professional', 'friendly', 'concise', 'confident'].map((value) => (
                  <label key={value} className="flex items-center gap-3 rounded-3xl border p-3">
                    <RadioGroupItem value={value} />
                    <span className="capitalize">{value}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ob-bio">Notes</Label>
              <Textarea id="ob-bio" className="mt-2 min-h-28" placeholder="What kinds of forms do you fill most often?" />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => { setOnboardingComplete(true); setState({ onboardingComplete: true }); navigateTo('dashboard'); }}>Skip</Button>
            <Button onClick={finish}>Save and continue</Button>
          </CardFooter>
        </Card>
      </div>
    </PublicFrame>
  );
}

export function NewFormScreen({ openAccountModal }) {
  const formUrl = useAppState((state) => state.formUrl);
  const [url, setUrl] = useState(formUrl || '');

  const analyze = () => {
    try {
      const normalized = normalizeSubmittedFormUrl(url, { allowDemo: true });
      setState({ formUrl: normalized });
      navigateTo('analyzing');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PublicFrame>
      <header className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigateTo('landing')}>Back</Button>
        <Button variant="ghost" onClick={() => navigateTo('landing')}>
          <img src="/logo.png" alt="FormMate" className="size-9 rounded-full" />
          <span className="font-black tracking-tight">FormMate</span>
        </Button>
        <Button variant="outline" onClick={() => openAccountModal('profile')}>Account</Button>
      </header>
      <div className="flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-4xl">
          <CardHeader className="items-center text-center">
            <Badge variant="secondary">New analysis</Badge>
            <CardTitle className="text-3xl font-black md:text-5xl">Bring in your next form.</CardTitle>
            <CardDescription className="max-w-2xl">Paste a public URL or use one of the demos to see the workspace immediately.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input id="url-input" aria-label="Form URL" placeholder="https://docs.google.com/forms/... or demo://job-application" value={url} onChange={(event) => setUrl(event.target.value)} />
            <Button id="btn-analyze" onClick={analyze}>Start analyzing</Button>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setState({ formUrl: 'demo://job-application' }); navigateTo('analyzing'); }}>Try job application demo</Button>
            <Button variant="ghost" size="sm" onClick={() => navigateTo('examples')}>Browse all demos</Button>
            <Button variant="ghost" size="sm" onClick={() => openAccountModal('help')}>Need help?</Button>
          </CardFooter>
        </Card>
      </div>
    </PublicFrame>
  );
}

function FieldInput({ id, label, type = 'text', defaultValue = '' }) {
  const mappedId = id === 'auth-email'
    ? 'login-email'
    : id === 'auth-password'
      ? 'login-password'
      : id;

  return (
    <div className="grid gap-2">
      <Label htmlFor={mappedId}>{label}</Label>
      <Input id={mappedId} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function PreviewRow({ title, copy }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border p-4">
      <div className="rounded-2xl bg-primary/10 p-2 text-primary">
        <span className="material-symbols-outlined leading-none">auto_awesome</span>
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{copy}</div>
      </div>
    </div>
  );
}
