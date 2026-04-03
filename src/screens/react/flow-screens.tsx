import { useEffect, useMemo, useState } from 'react';

import { capturedPayloadToFormData } from '@/parser/capture-parser';
import { detectFormPlatform, parseFormUrl } from '@/parser/form-parser';
import { MOCK_AI_ANSWERS } from '@/parser/mock-forms';
import { generateAnswers } from '@/ai/ai-actions';
import { navigateTo } from '@/router';
import { getState, setState } from '@/state';
import { incrementUsage, loadFormHistory, saveFormHistory } from '@/storage/local-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function AnalyzingScreen() {
  const formUrl = getState().formUrl;
  const capturePayload = getState().capturePayload;
  const isAuthenticated = getState().isAuthenticated;
  const [progress, setProgress] = useState(8);
  const [label, setLabel] = useState('Preparing');
  const [hint, setHint] = useState('Loading parser context...');
  const [captureState, setCaptureState] = useState({ open: false, icon: 'lock', message: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const platform = detectFormPlatform(formUrl || '');
  const analysisSteps = [
    { active: progress >= 18, label: 'Detect questions' },
    { active: progress >= 56, label: 'Understand field types' },
    { active: progress >= 74, label: 'Generate answers' },
  ];

  useEffect(() => {
    if (!formUrl && !capturePayload) {
      navigateTo(isAuthenticated ? 'new' : 'landing', true);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLabel('Detecting questions');
        setHint('Scanning form structure...');
        setProgress(18);
        await delay(250);
        if (cancelled) return;

        const nextFormData = capturePayload
          ? capturedPayloadToFormData(capturePayload)
          : await parseFormUrl(formUrl);
        if (cancelled) return;

        setLabel('Understanding inputs');
        setHint(`Found ${nextFormData.questions.length} fields.`);
        setProgress(56);
        await delay(250);
        if (cancelled) return;

        setLabel('Generating AI answers');
        setHint('Building suggestions...');
        setProgress(74);

        const demoId = String(nextFormData.url || formUrl || '').replace(/^demo:\/\//, '');
        const nextAnswers = MOCK_AI_ANSWERS[demoId]
          ? MOCK_AI_ANSWERS[demoId]
          : await generateAnswers(nextFormData, (current, total) => {
              if (!cancelled) {
                setProgress(74 + Math.round((current / Math.max(total, 1)) * 22));
                setHint(`Field ${current} of ${total}`);
              }
            });

        if (cancelled) return;

        incrementUsage('formsAnalyzed');
        saveFormHistory({
          id: `form_${Date.now()}`,
          title: nextFormData.title,
          url: nextFormData.url || formUrl,
          status: 'completed',
          provider: nextFormData.source || platform,
          fields: nextFormData.questions.length,
        });

        setState({
          capturePayload: null,
          formData: nextFormData,
          answers: nextAnswers,
          formHistory: loadFormHistory(),
        });

        setProgress(100);
        setLabel('Done');
        setHint('Opening workspace...');
        await delay(300);
        if (!cancelled) {
          navigateTo('workspace');
        }
      } catch (error) {
        if (cancelled) return;
        if (error?.code === 'AUTH_REQUIRED' || error?.code === 'RENDER_REQUIRED') {
          setCaptureState({
            open: true,
            icon: error?.code === 'AUTH_REQUIRED' ? 'lock' : 'preview',
            message: error?.code === 'AUTH_REQUIRED'
              ? 'This form requires sign-in. Use Assisted Capture while you are already signed in.'
              : 'This form is rendered client-side. Use Assisted Capture to import the visible fields.',
          });
          return;
        }
        setErrorMessage(error?.message || 'We could not analyze this form.');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [capturePayload, formUrl, isAuthenticated, platform]);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Card className="rounded-[2rem]">
        <CardHeader>
          <Badge variant="secondary">Analyzing</Badge>
          <CardTitle className="text-3xl font-black tracking-tight">{label}</CardTitle>
          <CardDescription>{platform} · {hint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Progress value={progress} />
          <div className="grid gap-3 md:grid-cols-3">
            {analysisSteps.map((step) => (
              <Card className={step.active ? 'border-primary/40' : 'border-dashed'} key={step.label}>
                <CardHeader>
                  <CardTitle className="text-base">{step.label}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button id="btn-back-header" onClick={() => navigateTo(isAuthenticated ? 'new' : 'landing')} type="button" variant="outline">Back</Button>
          <Button id="btn-cancel" onClick={() => navigateTo(isAuthenticated ? 'new' : 'landing')} size="icon" type="button" variant="ghost">
            <span className="material-symbols-outlined">close</span>
          </Button>
        </CardFooter>
      </Card>

      <Dialog onOpenChange={(open) => setCaptureState((current) => ({ ...current, open }))} open={captureState.open}>
        <DialogContent id="capture-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined" id="capture-modal-icon">{captureState.icon}</span>
              </span>
              Assisted Capture needed
            </DialogTitle>
            <DialogDescription id="capture-modal-msg">{captureState.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button id="btn-capture-demo" onClick={() => navigateTo('examples')} type="button" variant="outline">Try a demo</Button>
            <Button id="btn-capture-start" onClick={() => navigateTo('capture')} type="button">Use Assisted Capture</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setErrorMessage('')} open={Boolean(errorMessage)}>
        <DialogContent id="error-modal">
          <DialogHeader>
            <DialogTitle>Analysis failed</DialogTitle>
            <DialogDescription id="error-modal-msg">{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button id="btn-error-home" onClick={() => navigateTo(isAuthenticated ? 'new' : 'landing')} type="button" variant="outline">Back</Button>
            <Button id="btn-error-retry" onClick={() => navigateTo('analyzing', true)} type="button">Retry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReviewScreen() {
  const formData = getState().formData;
  const answers = getState().answers || {};

  useEffect(() => {
    if (!formData) {
      navigateTo('workspace', true);
    }
  }, [formData]);

  if (!formData) return null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Review results</CardTitle>
          <CardDescription>Check every answer before you leave the workspace.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-between">
          <Button id="btn-back-workspace" onClick={() => navigateTo('workspace')} type="button" variant="outline">Edit answers</Button>
          <Button id="btn-fill-disabled" onClick={() => navigateTo('success')} type="button">Submit flow</Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4">
        {formData.questions.map((question) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">{question.text}</CardTitle>
              <CardDescription>{question.type.replaceAll('_', ' ')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{answers[question.id]?.text || 'No answer yet'}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SuccessScreen() {
  const formTitle = getState().formData?.title || 'your current form';

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Card className="rounded-[2rem] text-center">
        <CardHeader>
          <Badge className="mx-auto" variant="secondary">Submitted</Badge>
          <CardTitle className="text-3xl font-black tracking-tight">Draft ready</CardTitle>
          <CardDescription>FormMate finished the review flow for {formTitle}.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center gap-3">
          <Button id="btn-new-form" onClick={() => navigateTo('new')} type="button" variant="outline">Analyze another form</Button>
          <Button onClick={() => navigateTo('dashboard')} type="button">Back to dashboard</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function CaptureScreen() {
  const [received, setReceived] = useState(false);
  const token = useMemo(() => new URLSearchParams(window.location.search).get('t'), []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (payload?.type !== 'FORMMATE_CAPTURE_V1') return;
      if (token && payload.token && payload.token !== token) return;

      const nextFormData = capturedPayloadToFormData(payload.payload);
      setState({
        capturePayload: null,
        formData: nextFormData,
        formUrl: nextFormData.url,
        answers: {},
      });
      saveFormHistory({
        id: `capture_${Date.now()}`,
        title: nextFormData.title,
        url: nextFormData.url,
        status: 'completed',
        provider: 'Captured',
        fields: nextFormData.questions.length,
      });
      setState({ formHistory: loadFormHistory() });
      setReceived(true);
      navigateTo('workspace');
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [token]);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Assisted Capture</CardTitle>
          <CardDescription>Keep this page open and post a `FORMMATE_CAPTURE_V1` payload from the live form tab.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            <AlertTitle>Waiting for capture payload</AlertTitle>
            <AlertDescription>Token: <code>{token || 'none'}</code>. Status: {received ? 'received' : 'listening'}.</AlertDescription>
          </Alert>
          <ScrollArea className="h-36 rounded-3xl border p-4">
            <pre className="text-xs text-muted-foreground">{`window.postMessage({ type: "FORMMATE_CAPTURE_V1", token: "${token || ''}", payload }, "*")`}</pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
