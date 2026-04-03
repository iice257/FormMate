import { useEffect } from 'react';

import { answeredCount } from '@/components/formmate-app.utils';
import { openAccountModal, type AccountModalTab } from '@/components/account-modal';
import { AccountModalHost } from '@/components/account-modal-host';
import { navigateTo } from '@/router';
import { useAppState } from '@/hooks/use-app-state';
import { AppShell } from '@/components/app-shell';
import { LandingScreen, AuthScreen, OnboardingScreen, NewFormScreen } from '@/screens/react/public-screens';
import { AnalyzingScreen, ReviewScreen, SuccessScreen, CaptureScreen } from '@/screens/react/flow-screens';
import { DashboardScreen, HistoryScreen, WorkspaceScreen, AiChatScreen, VaultScreen } from '@/screens/react/work-screens';
import { ExamplesScreen, DocsScreen, PricingScreen, AnalyticsScreen, HelpScreen, AccountsScreen } from '@/screens/react/catalog-screens';

const SHELL_SCREENS = new Set(['dashboard', 'history', 'workspace', 'ai-chat', 'vault', 'docs', 'pricing', 'examples', 'analytics', 'accounts', 'help']);

export function FormMateApp() {
  const currentScreen = useAppState((state) => state.currentScreen);
  const isAuthenticated = useAppState((state) => state.isAuthenticated);
  const userProfile = useAppState((state) => state.userProfile);
  const tier = useAppState((state) => state.tier);
  const formHistory = useAppState((state) => state.formHistory);
  const answers = useAppState((state) => state.answers);

  useEffect(() => {
    (window as any).__fmOpenAccountModalTab = (tab: AccountModalTab = 'profile') => {
      openAccountModal(tab);
    };
    return () => {
      delete (window as any).__fmOpenAccountModalTab;
    };
  }, []);

  const content = renderScreen(currentScreen, {
    tier,
    openAccountModal,
    formHistoryCount: formHistory.length,
    answerCount: answeredCount(answers),
  });

  return (
    <>
      {isAuthenticated && SHELL_SCREENS.has(currentScreen) ? (
        <AppShell currentScreen={currentScreen} userProfile={userProfile} tier={tier} onNavigate={navigateTo} onOpenAccount={openAccountModal}>
          {content}
        </AppShell>
      ) : (
        content
      )}

      <AccountModalHost />
    </>
  );
}

function renderScreen(currentScreen, props) {
  switch (currentScreen) {
    case 'auth':
      return <AuthScreen />;
    case 'onboarding':
      return <OnboardingScreen />;
    case 'new':
      return <NewFormScreen openAccountModal={props.openAccountModal} />;
    case 'analyzing':
      return <AnalyzingScreen />;
    case 'workspace':
      return <WorkspaceScreen />;
    case 'review':
      return <ReviewScreen />;
    case 'success':
      return <SuccessScreen />;
    case 'dashboard':
      return <DashboardScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'ai-chat':
      return <AiChatScreen />;
    case 'vault':
      return <VaultScreen />;
    case 'examples':
      return <ExamplesScreen />;
    case 'docs':
      return <DocsScreen />;
    case 'pricing':
      return <PricingScreen tier={props.tier} />;
    case 'analytics':
      return <AnalyticsScreen formHistoryCount={props.formHistoryCount} answerCount={props.answerCount} />;
    case 'help':
      return <HelpScreen openAccountModal={props.openAccountModal} />;
    case 'accounts':
      return <AccountsScreen />;
    case 'capture':
      return <CaptureScreen />;
    case 'landing':
    default:
      return <LandingScreen openAccountModal={props.openAccountModal} />;
  }
}
