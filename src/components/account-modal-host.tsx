import { useEffect, useMemo, useState, useSyncExternalStore } from "react"

import {
  closeAccountModal,
  getAccountModalSnapshot,
  setAccountModalTab,
  subscribeAccountModal,
} from "@/components/account-modal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { navigateTo } from "@/router"
import { getState, setState, updateProfile, updateSettings } from "@/state"
import { logSettingsChanged } from "@/storage/activity-logger"
import { applyTheme, normalizeTheme } from "@/theme"
import { useAppState } from "@/hooks/use-app-state"
import { signOut } from "@/auth/auth-service"
import { toast } from "@/components/toast"
import {
  isZenModeEnabled,
  isZenModeSupported,
  updateZenMode,
} from "@/components/zen-mode"

type AccountModalTab = ReturnType<typeof getAccountModalSnapshot>["activeTab"]

type ProfileDraft = {
  bio: string
  email: string
  name: string
  occupation: string
  phone: string
}

type SettingsDraft = {
  defaultPersonality: string
  temperature: number
  theme: "light" | "dark"
  verbosity: string
  zenMode: boolean
}

const FAQS = [
  {
    answer:
      "FormMate analyzes forms, maps fields, and helps you review answers based on your account data and current workspace context.",
    question: "How does FormMate work?",
  },
  {
    answer:
      "When Supabase is configured, authenticated accounts can sync profile, preferences, vault data, and history to the configured backend. Otherwise the app falls back to local browser storage.",
    question: "Is my data secure?",
  },
  {
    answer:
      "AI can still miss context. Review, edit, or regenerate answers, and tune Preferences for more precise output.",
    question: "Why did the AI answer a question wrong?",
  },
  {
    answer:
      "Profile, Preferences, and Help all live inside this account center. Vault stays one click away from the sidebar.",
    question: "Where do I update my profile and preferences?",
  },
]

const PERSONALITIES = [
  ["professional", "Professional"],
  ["friendly", "Friendly"],
  ["confident", "Confident"],
  ["concise", "Concise"],
] as const

const VERBOSITY_OPTIONS = [
  ["concise", "Concise"],
  ["balanced", "Balanced"],
  ["detailed", "Detailed"],
] as const

function getAvatarSrc(userProfile: ReturnType<typeof getState>["userProfile"]) {
  return (
    userProfile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userProfile?.name || "User",
    )}&background=2298da&color=fff&bold=true`
  )
}

function buildProfileDraft(
  userProfile: ReturnType<typeof getState>["userProfile"],
): ProfileDraft {
  return {
    bio: userProfile?.bio || "",
    email: userProfile?.email || "",
    name: userProfile?.name || "",
    occupation: userProfile?.occupation || "",
    phone: userProfile?.phone || "",
  }
}

function buildSettingsDraft(
  state: ReturnType<typeof getState>,
  currentScreen: string,
): SettingsDraft {
  return {
    defaultPersonality: state.settings?.ai?.defaultPersonality || "professional",
    temperature: state.settings?.ai?.temperature ?? 0.7,
    theme: normalizeTheme(state.settings?.ui?.theme),
    verbosity: state.settings?.ai?.verbosity || "balanced",
    zenMode: isZenModeSupported(currentScreen) ? isZenModeEnabled(currentScreen) : false,
  }
}

function SectionCopy({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function SettingRow({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean
  description: string
  disabled?: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl border bg-background/60 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function AccountModalHost() {
  const modalState = useSyncExternalStore(
    subscribeAccountModal,
    getAccountModalSnapshot,
    getAccountModalSnapshot,
  )

  const { currentScreen, settings, userProfile } = useAppState((state) => ({
    currentScreen: state.currentScreen,
    settings: state.settings,
    userProfile: state.userProfile,
  }))

  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() =>
    buildProfileDraft(userProfile),
  )
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() =>
    buildSettingsDraft(getState(), currentScreen),
  )

  const avatarSrc = useMemo(() => getAvatarSrc(userProfile), [userProfile])
  const displayName = userProfile?.name || "User"
  const zenSupported = isZenModeSupported(currentScreen)

  useEffect(() => {
    if (!modalState.open) {
      return
    }

    setProfileDraft(buildProfileDraft(userProfile))
    setSettingsDraft(buildSettingsDraft(getState(), currentScreen))
  }, [currentScreen, modalState.activeTab, modalState.open, settings, userProfile])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAccountModal()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setState({
      authUser: null,
      currentScreen: "auth",
      isAuthenticated: false,
      tier: "free",
      userProfile: {
        avatar: "",
        bio: "",
        email: "",
        experience: "",
        name: "",
        occupation: "",
        phone: "",
        preferredTone: "professional",
      },
    })
    closeAccountModal()
    toast.info("Signed out.")
    navigateTo("auth")
  }

  const saveProfile = () => {
    updateProfile(profileDraft)
    closeAccountModal()
    toast.success("Profile saved to this account.")
  }

  const saveSettings = () => {
    updateSettings("ai.temperature", settingsDraft.temperature)
    updateSettings("ai.verbosity", settingsDraft.verbosity)
    updateSettings("ai.defaultPersonality", settingsDraft.defaultPersonality)
    updateSettings("ui.theme", settingsDraft.theme)
    applyTheme(settingsDraft.theme)
    if (zenSupported) {
      updateZenMode(currentScreen, settingsDraft.zenMode)
    }
    logSettingsChanged("ai")
    closeAccountModal()
    toast.success("Preferences saved to this account.")
  }

  return (
    <Dialog open={modalState.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-5xl" showCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>Account Center</DialogTitle>
          <DialogDescription>
            Manage your profile, preferences, and support resources.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[680px] grid-cols-1 bg-background md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-6 border-b bg-muted/30 p-6 md:border-r md:border-b-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Form<span className="text-primary">Mate</span>
                </p>
                <p className="text-xs text-muted-foreground">Account Center</p>
              </div>
            </div>

            <div className="rounded-[28px] border bg-background p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 border">
                  <AvatarImage alt={displayName} src={avatarSrc} />
                  <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {userProfile?.email || "Signed in account"}
                  </p>
                </div>
              </div>
            </div>

            <Tabs
              className="gap-4"
              onValueChange={(value) => setAccountModalTab(value as AccountModalTab)}
              orientation="vertical"
              value={modalState.activeTab}
            >
              <TabsList className="h-auto w-full flex-col items-stretch rounded-[28px] bg-background p-2">
                <TabsTrigger className="justify-start rounded-2xl" value="profile">
                  Profile
                </TabsTrigger>
                <TabsTrigger className="justify-start rounded-2xl" value="settings">
                  Preferences
                </TabsTrigger>
                <TabsTrigger className="justify-start rounded-2xl" value="help">
                  Help
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-auto space-y-3">
              <Button
                className="w-full justify-between rounded-2xl"
                onClick={() => {
                  closeAccountModal()
                  navigateTo("vault")
                }}
                variant="outline"
              >
                <span>Open Vault</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Button>
              <Button className="w-full rounded-2xl" onClick={handleSignOut} variant="secondary">
                Sign Out
              </Button>
            </div>
          </aside>

          <ScrollArea className="h-[90vh]">
            <div className="flex min-h-full flex-col gap-8 p-6 md:p-8">
              {modalState.activeTab === "profile" ? (
                <section className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Profile</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage the information that follows your signed-in account.
                    </p>
                  </div>

                  <div className="rounded-[32px] border bg-muted/30 p-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-16 border-2 border-background shadow-sm">
                        <AvatarImage alt={displayName} src={avatarSrc} />
                        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Account avatar</p>
                        <p className="text-sm text-muted-foreground">
                          Avatar changes follow your current account profile data.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Full Name
                      </label>
                      <Input
                        onChange={(event) =>
                          setProfileDraft((draft) => ({ ...draft, name: event.target.value }))
                        }
                        value={profileDraft.name}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Email
                      </label>
                      <Input
                        onChange={(event) =>
                          setProfileDraft((draft) => ({ ...draft, email: event.target.value }))
                        }
                        type="email"
                        value={profileDraft.email}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Phone Number
                      </label>
                      <Input
                        onChange={(event) =>
                          setProfileDraft((draft) => ({ ...draft, phone: event.target.value }))
                        }
                        placeholder="+1 (555) 123-4567"
                        value={profileDraft.phone}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Occupation
                      </label>
                      <Input
                        onChange={(event) =>
                          setProfileDraft((draft) => ({
                            ...draft,
                            occupation: event.target.value,
                          }))
                        }
                        value={profileDraft.occupation}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Short Bio
                    </label>
                    <Textarea
                      className="min-h-32"
                      maxLength={150}
                      onChange={(event) =>
                        setProfileDraft((draft) => ({ ...draft, bio: event.target.value }))
                      }
                      placeholder="Write a short introduction..."
                      value={profileDraft.bio}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {profileDraft.bio.length}/150 characters
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button onClick={closeAccountModal} variant="outline">
                      Cancel
                    </Button>
                    <Button onClick={saveProfile}>Save Profile</Button>
                  </div>
                </section>
              ) : null}

              {modalState.activeTab === "settings" ? (
                <section className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Preferences</h2>
                    <p className="text-sm text-muted-foreground">
                      These preferences are saved against your signed-in account when remote
                      storage is configured.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-[32px] border bg-muted/30 p-6">
                    <SectionCopy
                      description="Control how responses are generated."
                      title="AI Behavior"
                    />
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium text-foreground">
                          Creativity
                        </label>
                        <Badge variant="secondary">{settingsDraft.temperature.toFixed(1)}</Badge>
                      </div>
                      <Slider
                        max={1}
                        min={0}
                        onValueChange={(value) =>
                          setSettingsDraft((draft) => ({
                            ...draft,
                            temperature: Number((value[0] ?? 0.7).toFixed(1)),
                          }))
                        }
                        step={0.1}
                        value={[settingsDraft.temperature]}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Precise</span>
                        <span>Creative</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">Verbosity</label>
                      <ToggleGroup
                        className="w-full flex-wrap"
                        onValueChange={(value) => {
                          if (!value) return
                          setSettingsDraft((draft) => ({ ...draft, verbosity: value }))
                        }}
                        type="single"
                        value={settingsDraft.verbosity}
                        variant="outline"
                      >
                        {VERBOSITY_OPTIONS.map(([value, label]) => (
                          <ToggleGroupItem className="flex-1" key={value} value={value}>
                            {label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">Personality</label>
                      <ToggleGroup
                        className="w-full flex-wrap"
                        onValueChange={(value) => {
                          if (!value) return
                          setSettingsDraft((draft) => ({
                            ...draft,
                            defaultPersonality: value,
                          }))
                        }}
                        type="single"
                        value={settingsDraft.defaultPersonality}
                        variant="outline"
                      >
                        {PERSONALITIES.map(([value, label]) => (
                          <ToggleGroupItem className="flex-1" key={value} value={value}>
                            {label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[32px] border bg-muted/30 p-6">
                    <SectionCopy
                      description="Pick a single app theme. Light stays the default."
                      title="Theme"
                    />
                    <Separator />
                    <ToggleGroup
                      className="w-full"
                      onValueChange={(value) => {
                        if (!value) return
                        const nextTheme = normalizeTheme(value)
                        setSettingsDraft((draft) => ({ ...draft, theme: nextTheme }))
                        applyTheme(nextTheme)
                      }}
                      type="single"
                      value={settingsDraft.theme}
                      variant="outline"
                    >
                      <ToggleGroupItem className="flex-1" value="light">
                        Light
                      </ToggleGroupItem>
                      <ToggleGroupItem className="flex-1" value="dark">
                        Dark
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-4 rounded-[32px] border bg-muted/30 p-6">
                    <SectionCopy
                      description={
                        zenSupported
                          ? `Focus the current ${currentScreen} screen.`
                          : "Available on Dashboard, AI Chat, New Form, History, Active Form, Vault, and Examples."
                      }
                      title="Focus Mode"
                    />
                    <Separator />
                    <SettingRow
                      checked={settingsDraft.zenMode}
                      description={
                        zenSupported
                          ? "Reduce navigation noise on supported screens."
                          : "This screen does not support focus mode."
                      }
                      disabled={!zenSupported}
                      label="Zen Mode"
                      onCheckedChange={(checked) =>
                        setSettingsDraft((draft) => ({ ...draft, zenMode: checked }))
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button onClick={closeAccountModal} variant="outline">
                      Cancel
                    </Button>
                    <Button onClick={saveSettings}>Save Preferences</Button>
                  </div>
                </section>
              ) : null}

              {modalState.activeTab === "help" ? (
                <section className="space-y-6">
                  <div className="rounded-[36px] bg-primary px-6 py-8 text-primary-foreground shadow-lg">
                    <div className="space-y-3">
                      <h2 className="text-2xl font-semibold">How can we help?</h2>
                      <p className="max-w-xl text-sm text-primary-foreground/85">
                        Use the docs, jump to contact, or open the feedback section without
                        leaving this account center.
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          className="rounded-full bg-white/15 text-primary-foreground hover:bg-white/20"
                          onClick={() => {
                            closeAccountModal()
                            navigateTo("docs")
                          }}
                          variant="ghost"
                        >
                          Docs
                        </Button>
                        <Button
                          className="rounded-full bg-white/15 text-primary-foreground hover:bg-white/20"
                          onClick={() => {
                            closeAccountModal()
                            navigateTo("docs")
                            window.setTimeout(() => {
                              document.getElementById("contact")?.scrollIntoView({
                                behavior: "smooth",
                              })
                            }, 250)
                          }}
                          variant="ghost"
                        >
                          Contact
                        </Button>
                        <Button
                          className="rounded-full bg-white/15 text-primary-foreground hover:bg-white/20"
                          onClick={() => {
                            closeAccountModal()
                            navigateTo("docs")
                            window.setTimeout(() => {
                              document.getElementById("feedback")?.scrollIntoView({
                                behavior: "smooth",
                              })
                            }, 250)
                          }}
                          variant="ghost"
                        >
                          Feedback
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Frequently Asked Questions
                    </h3>
                    <Accordion className="rounded-[28px]" collapsible type="single">
                      {FAQS.map((faq) => (
                        <AccordionItem key={faq.question} value={faq.question}>
                          <AccordionTrigger>{faq.question}</AccordionTrigger>
                          <AccordionContent>{faq.answer}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>

                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Version 0.6.35
                  </p>
                </section>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
