'use client'

import {
  FolderOpen,
  MoreHorizontal,
  Settings,
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  PanelLeft,
  Edit,
  Share2,
  Trash2,
  Sparkles,
  Wallet,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
  SidebarMenuAction,
} from '@/components/ui/sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession, signOut } from '@/lib/auth-client'
import { SettingsDialog } from '@/components/settings-dialog'

interface Chat {
  id: string
  title: string
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar()
  const { isMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const { data: session } = useSession()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [sharingChatId, setSharingChatId] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const editInputRef = useRef<HTMLInputElement>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history?limit=50')
      const data = await res.json()
      if (data.chats) {
        setChats(data.chats)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (chats.length === 0) return
    setIsLoadingMore(true)
    try {
      const lastChat = chats[chats.length - 1]
      const res = await fetch(`/api/history?limit=50&starting_after=${lastChat.id}`)
      const data = await res.json()
      if (data.chats) {
        setChats((prev) => [...prev, ...data.chats])
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to load more chat history:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [chats])

  const fetchCreditBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/credit/balance')
      if (res.ok) {
        const data = await res.json()
        if (data.balance) {
          setCreditBalance(parseFloat(data.balance))
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit balance:', error)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
    fetchCreditBalance()
  }, [fetchHistory, fetchCreditBalance])

  const handleEditStart = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId)
    setEditTitle(currentTitle)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const handleEditSave = async (chatId: string) => {
    if (!editTitle.trim()) return
    try {
      const res = await fetch(`/api/history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title: editTitle.trim() }),
      })
      if (res.ok) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId ? { ...c, title: editTitle.trim() } : c
          )
        )
      }
    } catch (error) {
      console.error("Failed to update chat title:", error)
    } finally {
      setEditingChatId(null)
      setEditTitle("")
    }
  }

  const handleEditCancel = () => {
    setEditingChatId(null)
    setEditTitle("")
  }

  const handleShare = async (chatId: string) => {
    try {
      const res = await fetch(`/api/history`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, visibility: "public" }),
      })
      if (res.ok) {
        const shareUrl = `${window.location.origin}/chat/${chatId}`
        await navigator.clipboard.writeText(shareUrl)
        setSharingChatId(chatId)
        setTimeout(() => setSharingChatId(null), 2000)
      }
    } catch (error) {
      console.error("Failed to share chat:", error)
    }
  }

  const handleDelete = async (chatId: string) => {
    try {
      const res = await fetch(`/api/history?chatId=${chatId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId))
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  const handleNewChat = () => {
    window.location.href = '/'
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {isCollapsed ? (
              <button
                onClick={() => toggleSidebar()}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors"
                aria-label="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            ) : (
              <>
                <div className="flex justify-center gap-2 md:justify-start">
                  <a href="/" className="flex items-center gap-2 font-medium">
                    <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                      <Sparkles className="size-4" />
                    </div>
                    Rexain Code
                  </a>
                </div>
              </>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => toggleSidebar()}
              className="p-1 hover:bg-sidebar-accent rounded-md transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-0">
            <SidebarGroup className="pb-2 px-2 pt-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="New Chat">
                    <button onClick={handleNewChat} className="flex items-center gap-2 w-full">
                      <FolderOpen className="h-5 w-5" />
                      {!isCollapsed && <span>New Chat</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            {!isCollapsed && (
              <div>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                  <SidebarGroupLabel>Chat History</SidebarGroupLabel>
                  <SidebarMenu>
                    {isLoading ? (
                      <SidebarMenuItem>
                        <span className="text-xs text-muted-foreground px-2 py-1">Loading...</span>
                      </SidebarMenuItem>
                    ) : chats.length === 0 ? (
                      <SidebarMenuItem>
                        <span className="text-xs text-muted-foreground px-2 py-1">No chats yet</span>
                      </SidebarMenuItem>
                    ) : (
                      <>
                        {chats.map((chat) => (
                          <SidebarMenuItem key={chat.id}>
                            {editingChatId === chat.id ? (
                              <div className="flex items-center gap-1 px-2 py-1">
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditSave(chat.id)
                                    if (e.key === "Escape") handleEditCancel()
                                  }}
                                  className="flex h-7 w-full rounded border border-sidebar-border bg-sidebar-accent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
                                />
                                <button
                                  onClick={() => handleEditSave(chat.id)}
                                  className="shrink-0 rounded p-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <>
                                <SidebarMenuButton asChild>
                                  <Link href={`/chat/${chat.id}`}>
                                    <span className="truncate max-w-[200px]">{chat.title}</span>
                                  </Link>
                                </SidebarMenuButton>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <SidebarMenuAction showOnHover>
                                      <MoreHorizontal />
                                      <span className="sr-only">More</span>
                                    </SidebarMenuAction>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    className="w-48 rounded-lg"
                                    side={isMobile ? "bottom" : "right"}
                                    align={isMobile ? "end" : "start"}
                                  >
                                    <DropdownMenuItem onSelect={(e) => {
                                      e.preventDefault()
                                      handleEditStart(chat.id, chat.title)
                                    }}>
                                      <Edit className="text-muted-foreground" />
                                      <span>Edit Chat</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => {
                                      e.preventDefault()
                                      handleShare(chat.id)
                                    }}>
                                      <Share2 className="text-muted-foreground" />
                                      <span>{sharingChatId === chat.id ? "Link copied!" : "Share Chat"}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault()
                                        if (confirm("Are you sure you want to delete this chat?")) {
                                          handleDelete(chat.id)
                                        }
                                      }}
                                    >
                                      <Trash2 className="text-muted-foreground" />
                                      <span>Delete Chat</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </SidebarMenuItem>
                        ))}
                        {hasMore && (
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              asChild
                              onClick={loadMore}
                              disabled={isLoadingMore}
                            >
                              <button className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground">
                                {isLoadingMore ? (
                                  <span>Loading...</span>
                                ) : (
                                  <span>Load more</span>
                                )}
                              </button>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </>
                    )}
                  </SidebarMenu>
                </SidebarGroup>
              </div>
            )}
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || 'User'} />
                    <AvatarFallback className="rounded-lg">
                      {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{session?.user?.name || 'User'}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || 'User'} />
                      <AvatarFallback className="rounded-lg">
                        {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{session?.user?.name || 'User'}</span>
                      <span className="truncate text-xs">{session?.user?.email || 'user@example.com'}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.preventDefault()
                  setSettingsOpen(true)
                }} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
                    Credit
                  </span>
                  <span className="font-semibold text-primary">
                    ${creditBalance.toFixed(2)}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={(e) => {
                    e.preventDefault()
                    setSettingsOpen(true)
                  }}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    <span>Help & Feedback</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  await signOut()
                  window.location.href = '/sign-in'
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  )
}