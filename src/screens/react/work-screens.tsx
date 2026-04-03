import { useEffect, useState } from 'react';

import { processChatMessage, quickEditAnswer, regenerateAnswer, generateAnswers } from '@/ai/ai-actions';
import { getAiErrorMessage } from '@/ai/ai-service';
import { categorizeField } from '@/ai/field-classifier';
import { detectFormPlatform } from '@/parser/form-parser';
import { useAppState } from '@/hooks/use-app-state';
import { navigateTo } from '@/router';
import { addChatMessage, getState, setState } from '@/state';
import { QuestionCard } from '@/components/question-card-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

function getAvatarSource(userProfile) {
  if (userProfile?.avatar) return userProfile.avatar;
  const name = userProfile?.name || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2298da&color=fff&bold=true`;
}

function getInitials(value) {
  return String(value || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function cleanAssistantText(value) {
  return String(value || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/\[fm-action[^\]]*\]([\s\S]*?)\[\/fm-action\]/g, '$1')
    .trim();
}

function answeredCount(answers) {
  return Object.values(answers || {}).filter((answer: any) => answer?.text).length;
}

function questionGroups(questions) {
  const groups = { autofillable: [], generatable: [], manual_only: [] };
  (questions || []).forEach((question) => {
    const category = categorizeField(question)?.category || 'generatable';
    groups[category]?.push(question);
  });
  return groups;
}

export function DashboardScreen() {
  const userProfile = useAppState((state) => state.userProfile);
  const tier = useAppState((state) => state.tier);
  const formHistory = useAppState((state) => state.formHistory);
  const formData = useAppState((state) => state.formData);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome back{userProfile?.name ? `, ${userProfile.name.split(' ')[0]}` : ''}.</CardTitle>
          <CardDescription>Everything you need is grouped into a single shadcn-based workspace now.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Forms analyzed" value={String(formHistory.length || 0)} />
          <MetricCard label="Current plan" value={tier === 'free' ? 'Free' : 'Pro'} />
          <MetricCard label="Workspace" value={formData ? 'Active' : 'Empty'} />
        </CardContent>
        <CardFooter className="gap-2">
          <Button id="btn-dashboard-open-history" onClick={() => navigateTo('history')}>Open history</Button>
          <Button id="btn-dashboard-open-workspace" variant="outline" onClick={() => navigateTo('workspace')}>
            {formData ? 'Resume active form' : 'Open workspace'}
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Your latest analyzed forms stay here for quick re-entry.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {formHistory.length ? formHistory.slice(0, 5).map((item) => (
              <div key={item.id || item.timestamp} className="flex items-center justify-between rounded-3xl border p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{item.title || 'Untitled form'}</div>
                  <div className="text-xs text-muted-foreground">{item.provider || 'Web form'} · {new Date(item.timestamp).toLocaleDateString()}</div>
                </div>
                <Badge variant="outline">{item.fields || 0} fields</Badge>
              </div>
            )) : (
              <Alert>
                <AlertTitle>No form history yet</AlertTitle>
                <AlertDescription>Analyze a form to populate the dashboard with history and workspace shortcuts.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump into common flows without leaving the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" onClick={() => navigateTo('new')}>Paste a new form link</Button>
            <Button variant="outline" onClick={() => navigateTo('ai-chat')}>Ask Copilot for help</Button>
            <Button variant="outline" onClick={() => navigateTo('vault')}>Review vault data</Button>
            <Button variant="outline" onClick={() => navigateTo('examples')}>Open demos</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const formHistory = useAppState((state) => state.formHistory);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Form history</CardTitle>
          <CardDescription>Review previously analyzed forms and the provider metadata captured for each run.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-between">
          <Badge variant="secondary">{formHistory.length} saved runs</Badge>
          <Button id="btn-export-all" variant="outline" onClick={() => navigateTo('docs')}>Export deferred</Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4">
        {formHistory.length ? formHistory.map((item) => (
          <Card key={item.id || item.timestamp}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{item.title || 'Untitled form'}</div>
                <div className="text-sm text-muted-foreground">{item.provider || 'Web form'} · {new Date(item.timestamp).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.fields || 0} fields</Badge>
                <Button size="sm" variant="outline" disabled>Saved</Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Alert>
            <AlertTitle>No history found</AlertTitle>
            <AlertDescription>Analyze a new form and it will appear here with timestamped metadata.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

export function WorkspaceScreen() {
  const formData = useAppState((state) => state.formData);
  const answers = useAppState((state) => state.answers);
  const [filter, setFilter] = useState('all');
  const [activePanel, setActivePanel] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ id: 'intro', role: 'assistant', text: 'I can help refine answers, explain field categories, and draft stronger responses for this active form.' }]);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    if (!formData) navigateTo('landing');
  }, [formData]);
  if (!formData) return null;

  const grouped = questionGroups(formData.questions);
  const visibleQuestions = filter === 'all' ? formData.questions : grouped[filter] || [];
  const totalAnswered = answeredCount(answers);

  const sendChat = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || chatPending) return;
    setChatPending(true);
    setChatInput('');
    setChatMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: trimmed }]);
    addChatMessage('user', trimmed);
    const nextHistory = [...chatHistory, { role: 'user', content: trimmed }];
    setChatHistory(nextHistory);

    try {
      const response = await processChatMessage(trimmed, formData, nextHistory, getState().activeQuestionId);
      const clean = cleanAssistantText(response) || 'I did not generate a response.';
      setChatMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: clean }]);
      addChatMessage('assistant', clean);
      setChatHistory((current) => [...current, { role: 'assistant', content: clean }]);
    } catch (error) {
      const message = getAiErrorMessage(error, 'AI service is unavailable right now.');
      setChatMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: 'assistant', text: message }]);
    } finally {
      setChatPending(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{formData.title}</h1>
            <CardDescription>{totalAnswered} of {formData.questions.length} questions currently have answers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{detectFormPlatform(formData.url)}</Badge>
              <Progress value={(totalAnswered / Math.max(formData.questions.length, 1)) * 100} />
            </div>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><Button variant="link" className="h-auto px-0" onClick={() => navigateTo('dashboard')}>Dashboard</Button></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Active form</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="autofillable">Autofillable</TabsTrigger>
                <TabsTrigger value="generatable">AI generated</TabsTrigger>
                <TabsTrigger value="manual_only">Manual</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="ml-auto flex gap-2">
              <Button id="btn-review-all" variant="outline" onClick={() => navigateTo('review')}>Review answers</Button>
              <Button id="btn-review-bottom" onClick={() => navigateTo('review')}>Review and submit</Button>
            </div>
          </CardFooter>
        </Card>

        <div className="grid gap-4">
          {visibleQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              answer={answers[question.id]}
              onRegenerate={async () => {
                try {
                  const result = await regenerateAnswer(question, answers[question.id]?.text || '');
                  setState({ answers: { ...getState().answers, [question.id]: { ...result, source: 'ai' } } });
                } catch (error) {
                  console.error(error);
                }
              }}
              onQuickEdit={async (instruction) => {
                try {
                  const result = await quickEditAnswer(question, answers[question.id]?.text || '', instruction);
                  setState({ answers: { ...getState().answers, [question.id]: { ...result, source: 'edited' } } });
                } catch (error) {
                  console.error(error);
                }
              }}
            />
          ))}
        </div>
      </div>

      <Card className="xl:sticky xl:top-24 xl:self-start">
        <CardHeader>
          <CardTitle>Workspace copilot</CardTitle>
          <CardDescription>Ask about specific answers, tone, or field meaning.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Tabs value={activePanel} onValueChange={setActivePanel}>
            <TabsList className="w-full">
              <TabsTrigger id="toggle-ai-chat" value="chat">AI chat</TabsTrigger>
              <TabsTrigger id="toggle-ai-actions" value="actions">AI actions</TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <ScrollArea className="h-80 rounded-3xl border p-4">
                <div className="grid gap-3">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-sm text-primary-foreground' : 'max-w-[85%] rounded-3xl bg-muted px-4 py-3 text-sm'}>
                      {message.text}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-3 grid gap-3">
                <Input id="chat-input" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask Copilot anything..." />
                <Button id="btn-send-chat" disabled={!chatInput.trim() || chatPending} onClick={() => void sendChat(chatInput)}>{chatPending ? 'Thinking...' : 'Send'}</Button>
              </div>
            </TabsContent>

            <TabsContent value="actions">
              <div className="grid gap-3">
                <Button id="btn-generate-all" onClick={async () => {
                  try {
                    const nextAnswers = await generateAnswers(formData, undefined);
                    setState({ answers: { ...getState().answers, ...nextAnswers } });
                  } catch (error) {
                    console.error(error);
                  }
                }}>
                  Generate all
                </Button>
                <Button variant="outline" onClick={() => void sendChat('Make all answers more professional')}>Make answers more professional</Button>
                <Button variant="outline" onClick={() => void sendChat('Shorten the longest answers in this form')}>Shorten long answers</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export function AiChatScreen() {
  const formData = useAppState((state) => state.formData);
  const userProfile = useAppState((state) => state.userProfile);
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', text: 'Ask about a current form, tone changes, or how to improve an answer before submitting it.' }]);
  const [history, setHistory] = useState([]);

  const send = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || chatPending) return;
    setChatPending(true);
    setChatInput('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: trimmed }]);
    const nextHistory = [...history, { role: 'user', content: trimmed }];
    setHistory(nextHistory);

    try {
      const response = await processChatMessage(trimmed, formData, nextHistory);
      const clean = cleanAssistantText(response) || 'I did not generate a response.';
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: clean }]);
      setHistory((current) => [...current, { role: 'assistant', content: clean }]);
    } catch (error) {
      const message = getAiErrorMessage(error, 'AI service is unavailable right now.');
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: 'assistant', text: message }]);
    } finally {
      setChatPending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-h-[70svh]">
        <CardHeader>
          <CardTitle>FormMate AI</CardTitle>
          <CardDescription>Use the standalone copilot when you need a bigger conversation surface.</CardDescription>
        </CardHeader>
        <CardContent className="grid h-full gap-4">
          <ScrollArea className="h-[50svh] rounded-3xl border p-4">
            <div className="grid gap-3">
              {messages.map((message) => (
                <div key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-sm text-primary-foreground' : 'max-w-[85%] rounded-3xl bg-muted px-4 py-3 text-sm'}>
                  {message.text}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="grid gap-3">
            <Input id="chat-input" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Message FormMate AI..." />
            <Button id="btn-send" disabled={!chatInput.trim() || chatPending} onClick={() => void send(chatInput)}>{chatPending ? 'Thinking...' : 'Send message'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Context</CardTitle>
          <CardDescription>The assistant can use your active form and account profile as context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3 rounded-3xl border p-3">
            <Avatar className="size-10">
              <AvatarImage src={getAvatarSource(userProfile)} alt={userProfile?.name || 'User'} />
              <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{userProfile?.name || 'User'}</div>
              <div className="text-xs text-muted-foreground">{userProfile?.email || 'Local account'}</div>
            </div>
          </div>
          <Alert>
            <AlertTitle>Active form</AlertTitle>
            <AlertDescription>{formData?.title || 'No active form attached yet.'}</AlertDescription>
          </Alert>
          <Button id="btn-new-chat" variant="outline" onClick={() => { setMessages(messages.slice(0, 1)); setHistory([]); }}>Start new chat</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function VaultScreen() {
  const vault = useAppState((state) => state.vault);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Vault</CardTitle>
          <CardDescription>Saved data that can be reused across future forms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {[
            ['fullName', 'Full Name'],
            ['email', 'Email Address'],
            ['phone', 'Phone Number'],
            ['address', 'Address'],
            ['jobTitle', 'Current Role'],
            ['company', 'Company'],
          ].map(([key, label]) => (
            <div key={key} className="grid gap-2">
              <Label htmlFor={`vault-${key}`}>{label}</Label>
              <Input id={`vault-${key}`} defaultValue={vault[key] || ''} onBlur={(event) => setState({ vault: { ...getState().vault, [key]: event.target.value } })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How the vault is used</CardTitle>
          <CardDescription>Promote stable facts here so the parser and AI do less repetitive work later.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Alert>
            <AlertTitle>Reusable facts</AlertTitle>
            <AlertDescription>Names, contact info, skills, and education are the highest-value fields to keep up to date.</AlertDescription>
          </Alert>
          <Alert>
            <AlertTitle>File uploads stay manual</AlertTitle>
            <AlertDescription>File uploads are flagged during review because there is no direct shadcn file-upload primitive in this registry.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-black">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
