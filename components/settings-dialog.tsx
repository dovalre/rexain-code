'use client'

import * as React from "react"
import {
  Settings,
  CircleUser,
  Github,
  Link2,
  Unlink,
  Loader2,
  Moon,
  Sun,
  Wallet,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { authClient } from "@/lib/auth-client"

const data = {
  nav: [
    { name: "General", icon: Settings },
    { name: "Account", icon: CircleUser },
    { name: "Billing", icon: Wallet },
  ],
}

const CREDIT_PACKAGES = [
  { id: "credit_5", amount: 500, credit: 5, label: "$5" },
  { id: "credit_10", amount: 1000, credit: 10, label: "$10" },
  { id: "credit_20", amount: 2000, credit: 20, label: "$20" },
  { id: "credit_50", amount: 5000, credit: 50, label: "$50" },
  { id: "credit_100", amount: 10000, credit: 100, label: "$100" },
  { id: "credit_200", amount: 20000, credit: 200, label: "$200" },
]

interface Transaction {
  id: string
  type: "topup" | "usage"
  amount: string
  balanceAfter: string
  description: string | null
  generationId: string | null
  chatId: string | null
  createdAt: string
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = React.useState("General")
  const [accounts, setAccounts] = React.useState<Array<{ providerId: string; id: string }>>([])
  const [loadingAccounts, setLoadingAccounts] = React.useState(false)
  const [linking, setLinking] = React.useState(false)
  const [unlinking, setUnlinking] = React.useState<string | null>(null)
  const [theme, setTheme] = React.useState<"light" | "dark">("light")

  // Billing state
  const [creditBalance, setCreditBalance] = React.useState<number>(0)
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [loadingBilling, setLoadingBilling] = React.useState(false)
  const [topupLoading, setTopupLoading] = React.useState<string | null>(null)
  const [customAmount, setCustomAmount] = React.useState<string>("")
  const [customAmountError, setCustomAmountError] = React.useState<string | null>(null)

  const fetchAccounts = React.useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const { data } = await authClient.listAccounts()
      if (data) {
        setAccounts(data)
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const fetchBillingData = React.useCallback(async () => {
    setLoadingBilling(true)
    try {
      const [balanceRes, txRes] = await Promise.all([
        fetch("/api/credit/balance"),
        fetch("/api/credit/transactions?limit=20"),
      ])
      const balanceData = await balanceRes.json()
      const txData = await txRes.json()
      if (balanceData.balance) {
        setCreditBalance(parseFloat(balanceData.balance))
      }
      if (txData.transactions) {
        setTransactions(txData.transactions)
      }
    } catch (err) {
      console.error("Failed to fetch billing data:", err)
    } finally {
      setLoadingBilling(false)
    }
  }, [])

  React.useEffect(() => {
    // Initialize theme from localStorage or system preference
    const storedTheme = localStorage.getItem("theme")
    if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    } else {
      setTheme("light")
      document.documentElement.classList.remove("dark")
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      fetchAccounts()
      fetchBillingData()
    }
  }, [open, fetchAccounts, fetchBillingData])

  const isGithubLinked = accounts.some((a) => a.providerId === "github")
  const isGoogleLinked = accounts.some((a) => a.providerId === "google")

  const handleLinkGithub = async () => {
    setLinking(true)
    try {
      await authClient.linkSocial({
        provider: "github",
        callbackURL: window.location.href,
        scopes: ["repo"],
      })
    } catch (err) {
      console.error("Failed to link GitHub:", err)
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkGithub = async () => {
    const githubAccount = accounts.find((a) => a.providerId === "github")
    if (!githubAccount) return

    setUnlinking("github")
    try {
      const { error } = await authClient.unlinkAccount({
        providerId: "github",
        accountId: githubAccount.id,
      })
      if (!error) {
        setAccounts((prev) => prev.filter((a) => a.providerId !== "github"))
      }
    } catch (err) {
      console.error("Failed to unlink GitHub:", err)
    } finally {
      setUnlinking(null)
    }
  }

  const handleLinkGoogle = async () => {
    setLinking(true)
    try {
      await authClient.linkSocial({
        provider: "google",
        callbackURL: window.location.href,
      })
    } catch (err) {
      console.error("Failed to link Google:", err)
    } finally {
      setLinking(false)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const handleUnlinkGoogle = async () => {
    const googleAccount = accounts.find((a) => a.providerId === "google")
    if (!googleAccount) return

    setUnlinking("google")
    try {
      const { error } = await authClient.unlinkAccount({
        providerId: "google",
        accountId: googleAccount.id,
      })
      if (!error) {
        setAccounts((prev) => prev.filter((a) => a.providerId !== "google"))
      }
    } catch (err) {
      console.error("Failed to unlink Google:", err)
    } finally {
      setUnlinking(null)
    }
  }

  const handleTopup = async (packageId: string) => {
    setTopupLoading(packageId)
    try {
      const res = await fetch("/api/credit/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Failed to create top-up session:", err)
    } finally {
      setTopupLoading(null)
    }
  }

  const handleCustomTopup = async () => {
    const amount = parseFloat(customAmount)
    if (!customAmount || isNaN(amount) || amount < 1 || amount > 1000) {
      setCustomAmountError("Enter an amount between $1 and $1000")
      return
    }
    setCustomAmountError(null)
    setTopupLoading("custom")
    try {
      const res = await fetch("/api/credit/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        setCustomAmountError(data.error)
      }
    } catch (err) {
      console.error("Failed to create custom top-up session:", err)
      setCustomAmountError("Failed to create top-up session")
    } finally {
      setTopupLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={activeTab === item.name}
                          onClick={() => setActiveTab(item.name)}
                        >
                          <a href="#">
                            <item.icon />
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{activeTab}</h2>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {activeTab === "Account" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Linked Accounts</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Connect your accounts to enable single sign-on and access additional features.
                    </p>

                    {loadingAccounts ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading accounts...
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* GitHub */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              <Github className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">GitHub</p>
                              <p className="text-xs text-muted-foreground">
                                {isGithubLinked
                                  ? "Connected"
                                  : "Not connected"}
                              </p>
                            </div>
                          </div>
                          {isGithubLinked ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleUnlinkGithub}
                              disabled={unlinking === "github"}
                            >
                              {unlinking === "github" ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Unlink className="h-4 w-4 mr-1" />
                              )}
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLinkGithub}
                              disabled={linking}
                            >
                              {linking ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Link2 className="h-4 w-4 mr-1" />
                              )}
                              Connect
                            </Button>
                          )}
                        </div>

                        {/* Google */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                                <path
                                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                  fill="currentColor"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Google</p>
                              <p className="text-xs text-muted-foreground">
                                {isGoogleLinked
                                  ? "Connected"
                                  : "Not connected"}
                              </p>
                            </div>
                          </div>
                          {isGoogleLinked ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleUnlinkGoogle}
                              disabled={unlinking === "google"}
                            >
                              {unlinking === "google" ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Unlink className="h-4 w-4 mr-1" />
                              )}
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleLinkGoogle}
                              disabled={linking}
                            >
                              {linking ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Link2 className="h-4 w-4 mr-1" />
                              )}
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "General" && (
                <div className="flex flex-1 flex-col gap-6 pt-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Appearance</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Customize the appearance of the application.
                    </p>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          {theme === "dark" ? (
                            <Moon className="h-5 w-5" />
                          ) : (
                            <Sun className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="theme-mode" className="text-sm font-medium">
                            Dark Mode
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {theme === "dark" ? "Dark theme is active" : "Light theme is active"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="theme-mode"
                        checked={theme === "dark"}
                        onCheckedChange={toggleTheme}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Billing" && (
                <div className="flex flex-1 flex-col gap-6 pt-4">
                  {/* Credit Balance Card */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Credit Balance</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Your credit balance is used to pay for AI model usage. Top up to continue using the agent.
                    </p>
                    {loadingBilling ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading balance...
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              ${creditBalance.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">USD</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top-up Packages */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Top Up Credits</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add credit to your balance via Stripe. You'll be redirected to a secure payment page.
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {CREDIT_PACKAGES.map((pkg) => (
                        <Button
                          key={pkg.id}
                          variant="outline"
                          className="flex flex-col items-center gap-1 h-auto py-3"
                          onClick={() => handleTopup(pkg.id)}
                          disabled={topupLoading === pkg.id}
                        >
                          {topupLoading === pkg.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span className="text-lg font-bold">{pkg.label}</span>
                              <span className="text-xs text-muted-foreground">USD</span>
                            </>
                          )}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Amount Top-up */}
                    <div className="mt-4 rounded-lg border p-4">
                      <p className="text-sm font-medium mb-1">Custom Amount</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Enter any amount between $1 and $1000.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="0.01"
                            value={customAmount}
                            onChange={(e) => {
                              setCustomAmount(e.target.value)
                              setCustomAmountError(null)
                            }}
                            placeholder="Enter amount"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 pl-7 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <Button
                          onClick={handleCustomTopup}
                          disabled={topupLoading === "custom"}
                          className="shrink-0"
                        >
                          {topupLoading === "custom" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1" />
                          )}
                          Top Up
                        </Button>
                      </div>
                      {customAmountError && (
                        <p className="mt-2 text-xs text-red-500">{customAmountError}</p>
                      )}
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Transaction History</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Recent credit transactions (top-ups and usage deductions).
                    </p>
                    {loadingBilling ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading transactions...
                      </div>
                    ) : transactions.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No transactions yet
                      </p>
                    ) : (
                      <ScrollArea className="h-[200px] rounded-lg border">
                        <div className="divide-y">
                          {transactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  {tx.type === "topup" ? (
                                    <ArrowDownCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {tx.description || (tx.type === "topup" ? "Top-up" : "AI Usage")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(tx.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-sm font-medium ${
                                    tx.type === "topup"
                                      ? "text-green-500"
                                      : "text-orange-500"
                                  }`}
                                >
                                  {tx.type === "topup" ? "+" : "-"}$
                                  {parseFloat(tx.amount).toFixed(6)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Balance: ${parseFloat(tx.balanceAfter).toFixed(6)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}