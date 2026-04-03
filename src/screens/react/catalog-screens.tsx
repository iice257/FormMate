import { MOCK_FORMS } from '@/parser/mock-forms';
import { signOut } from '@/auth/auth-service';
import { navigateTo } from '@/router';
import { getState, setState } from '@/state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const HELP_FAQS = [
  {
    question: 'Why did FormMate ask me to use Assisted Capture?',
    answer: 'Some providers require authentication or render their forms entirely in the browser. Assisted Capture imports the visible fields while you are already signed in.',
  },
  {
    question: 'Does FormMate submit forms automatically?',
    answer: 'Not in this build. FormMate prepares and helps you review answers, but the final submission remains manual.',
  },
  {
    question: 'Where are my answers stored?',
    answer: 'Answers, settings, history, and vault data are stored in browser storage by default and can be hydrated from remote storage when configured.',
  },
];

const DOC_SECTIONS = [
  { id: 'first-form', title: 'Getting started', copy: 'Paste a public form link, let FormMate analyze the structure, then review and refine answers before submitting.' },
  { id: 'copilot', title: 'AI copilot', copy: 'Use workspace chat or the standalone AI chat surface to rewrite answers, explain field intent, and tighten tone.' },
  { id: 'contact', title: 'Support', copy: 'Need help with parsing, auth-required forms, or storage? Use Assisted Capture or contact support from the account center.' },
  { id: 'feedback', title: 'Feedback', copy: 'Share gaps in parsing accuracy, missing providers, or flows that should be automated next.' },
];

const PRICING_PLANS = [
  { id: 'free', name: 'Free', price: '$0', copy: 'Best for testing the workflow and exploring demo forms.', features: ['Manual review workflow', 'Local vault storage', 'Limited AI actions'] },
  { id: 'monthly', name: 'Pro', price: '$19/mo', copy: 'Best for active job seekers, operators, and anyone working through repetitive applications.', features: ['Expanded AI assistance', 'Remote profile hydration', 'Priority future automation'] },
  { id: 'team', name: 'Team', price: 'Custom', copy: 'For shared intake, recruiting, and operations teams.', features: ['Shared knowledge flows', 'Admin controls', 'Workflow support'] },
];

export function ExamplesScreen() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Example gallery</CardTitle>
          <CardDescription>Use one of the bundled demo forms to jump straight into the workspace.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(MOCK_FORMS).map(([key, form]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{form.title}</CardTitle>
              <CardDescription>{form.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant="outline">{form.questions.length} fields</Badge>
              <Badge variant="secondary">demo://{key}</Badge>
            </CardContent>
            <CardFooter>
              <Button className="demo-card w-full" data-url={`demo://${key}`} onClick={() => { setState({ formUrl: `demo://${key}` }); navigateTo('analyzing'); }}>
                Open demo
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DocsScreen() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>Core product guidance condensed into the new Luma-styled knowledge surface.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button id="btn-home" onClick={() => navigateTo(getState().isAuthenticated ? 'dashboard' : 'landing')} variant="outline">
            Back home
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {DOC_SECTIONS.map((section) => (
          <Card key={section.id} id={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.copy}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card id="faqs">
        <CardHeader>
          <CardTitle>FAQs</CardTitle>
          <CardDescription>Answers to the most common questions we see during migration and form parsing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {HELP_FAQS.map((faq, index) => (
              <AccordionItem key={faq.question} value={`docs-faq-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

export function PricingScreen({ tier }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Choose the level of AI assistance and storage you need.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <Card key={plan.id} className={plan.id === tier ? 'ring-2 ring-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.id === tier ? <Badge>Current</Badge> : null}
              </div>
              <CardDescription>{plan.copy}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="text-3xl font-black">{plan.price}</div>
              {plan.features.map((feature) => (
                <div key={feature} className="text-sm">{feature}</div>
              ))}
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.id === tier ? 'outline' : 'default'} disabled={plan.id === tier}>
                {plan.id === tier ? 'Current plan' : 'Not yet enabled'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsScreen({ formHistoryCount, answerCount }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Telemetry remains lightweight, but the dashboard surfaces the signals currently available in local storage.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Analyzed forms" value={String(formHistoryCount || 0)} />
        <MetricCard label="Current answers" value={String(answerCount || 0)} />
        <MetricCard label="Auto metrics" value="Pending" />
      </div>
    </div>
  );
}

export function HelpScreen({ openAccountModal }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Help center</CardTitle>
          <CardDescription>Use the account center for profile-aware support or jump into documentation directly.</CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button onClick={() => openAccountModal('help')}>Open account help</Button>
          <Button variant="outline" onClick={() => navigateTo('docs')}>Open docs</Button>
          <Button variant="outline" onClick={() => navigateTo('capture')}>Use Assisted Capture</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardContent>
          <Accordion type="single" collapsible>
            {HELP_FAQS.map((faq, index) => (
              <AccordionItem key={faq.question} value={`help-faq-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountsScreen() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Profile management now lives in shadcn tabs, while the global header can still open the account dialog.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-5">
            {['Profile', 'Preferences', 'Vault', 'Help', 'Security'].map((label, index) => (
              <TabsTrigger key={label} data-tab-index={index} value={label.toLowerCase()}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent className="pt-4" value="profile">
            <p className="text-sm text-muted-foreground">Use the account center dialog from the header to edit profile fields.</p>
          </TabsContent>
          <TabsContent className="pt-4" value="preferences">
            <p className="text-sm text-muted-foreground">Preferences are available in the dialog host.</p>
          </TabsContent>
          <TabsContent className="pt-4" value="vault">
            <p className="text-sm text-muted-foreground">Vault data lives in its dedicated workspace screen.</p>
          </TabsContent>
          <TabsContent className="pt-4" value="help">
            <p className="text-sm text-muted-foreground">Support links are available in docs and the account help dialog tab.</p>
          </TabsContent>
          <TabsContent className="pt-4" value="security">
            <Button id="btn-signout" onClick={async () => {
              await signOut();
              setState({ authUser: null, isAuthenticated: false, tier: 'free' });
              navigateTo('auth', true);
            }}>
              Sign out
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
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
