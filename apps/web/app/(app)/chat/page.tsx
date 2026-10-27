"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import {
  apiGet,
  apiPost,
  GATEWAY_URL,
  tryRefreshTokens,
  ApiError,
} from "@/lib/client"
import type { ChatMessage, ChatUser, ConversationsResponse } from "@/lib/types"
import { useChatUnread } from "@/store/useChatUnread"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { toast } from "sonner"
import { Loader2, MessageCircle, Send, Users } from "lucide-react"
import { io, type Socket } from "socket.io-client"

function initials(
  name: string | null | undefined,
  username: string | null | undefined
): string {
  const src = (name || username || "?").trim()
  const parts = src.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

function formatTime(iso: string | number | Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

type Ack = { success?: boolean; error?: string; online?: string[] }

export default function ChatPage() {
  const mounted = useHydrated()
  const storeHydrated = useAppStore((s) => s.hasHydrated)
  const hydrated = mounted && storeHydrated
  const accessToken = useAppStore((s) => s.accessToken)
  const user = useAppStore((s) => s.user)
  const myId = user?.user?.id ?? null

  const [convos, setConvos] = useState<ConversationsResponse | null>(null)
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingConvo, setLoadingConvo] = useState(false)
  const [composer, setComposer] = useState("")
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [searching, setSearching] = useState(false)
  const [online, setOnline] = useState<Record<string, string[]>>({})
  const [typingIds, setTypingIds] = useState<Record<string, string[]>>({})

  const socketRef = useRef<Socket | null>(null)
  const activeRoomRef = useRef<string | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmitRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadByRoom = useChatUnread((s) => s.byRoom)

  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  const loadConvos = useCallback(async () => {
    try {
      const data = await apiGet<ConversationsResponse>("/chat/conversations")
      setConvos(data)
      // Seed the unread store from the payload (per-room counts) — keeps the
      // chat list and the app-sidebar badge in agreement.
      const { activeRoom } = useChatUnread.getState()
      const byRoom: Record<string, number> = {}
      let total = 0
      for (const t of data.teams) {
        if (t.room === activeRoom) continue
        byRoom[t.room] = t.unread
        total += t.unread
      }
      for (const d of data.dms) {
        if (d.room === activeRoom) continue
        byRoom[d.room] = d.unread
        total += d.unread
      }
      useChatUnread.setState({ byRoom, total })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load conversations"
      )
    }
  }, [])

  const loadMessages = useCallback(async (room: string) => {
    setLoadingConvo(true)
    try {
      const data = await apiGet<ChatMessage[]>(
        `/chat/rooms/${encodeURIComponent(room)}/messages`
      )
      setMessages(data)
    } catch (err) {
      // Room with no messages yet returns 404 from the service — show empty.
      if (err instanceof ApiError && err.status === 404) {
        setMessages([])
      } else {
        toast.error(
          err instanceof Error ? err.message : "Failed to load messages"
        )
        setMessages([])
      }
    } finally {
      setLoadingConvo(false)
    }
  }, [])

  const selectRoom = useCallback(
    (room: string) => {
      const prev = activeRoomRef.current
      if (prev && prev !== room) {
        socketRef.current?.emit("leave_room", { room: prev })
      }
      setActiveRoom(room)
      activeRoomRef.current = room
      setMessages([])
      setTypingIds((t) => ({ ...t, [room]: [] }))

      // Opening a room marks it read (server cursor updates on join_room;
      // the local clear makes the badge disappear immediately).
      useChatUnread.getState().setActiveRoom(room)
      useChatUnread.getState().clear(room)

      // Join first — the service lazily creates the room on join, so history
      // would 404 if fetched in parallel for a brand-new team/DM room.
      socketRef.current?.emit("join_room", { room }, (res?: Ack) => {
        if (res?.success === false) {
          toast.error(res.error || "Failed to join room")
          return
        }
        if (res?.online) {
          setOnline((prev) => ({ ...prev, [room]: res.online as string[] }))
        }
        loadMessages(room)
      })
    },
    [loadMessages]
  )

  // Socket connection
  useEffect(() => {
    if (!hydrated || !accessToken || !myId) return

    const socket = io(GATEWAY_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    })
    socketRef.current = socket

    socket.on("connect_error", async (err) => {
      if (/token|auth|unauthor/i.test(err.message)) {
        const ok = await tryRefreshTokens()
        if (ok) {
          const newToken = useAppStore.getState().accessToken
          if (newToken) {
            socket.auth = { token: newToken }
            socket.connect()
            return
          }
        }
        toast.error("Session expired. Please sign in again.")
      }
    })

    socket.on("message", (msg: ChatMessage) => {
      if (
        msg.room === activeRoomRef.current ||
        msg.roomId === activeRoomRef.current
      ) {
        setMessages((prev) => [...prev, msg])
        return
      }
      // Background conversation: badge bump + live preview refresh.
      useChatUnread.getState().bump(msg.room ?? "", msg.senderId, myId)
      setConvos((prev) => {
        if (!prev || !msg.room) return prev
        return {
          ...prev,
          dms: prev.dms.map((d) =>
            d.room === msg.room
              ? {
                  ...d,
                  lastMessage: {
                    content: msg.content,
                    createdAt: msg.createdAt,
                  },
                }
              : d
          ),
        }
      })
    })

    socket.on(
      "typing",
      (payload: { room: string; userId: string; isTyping: boolean }) => {
        setTypingIds((prev) => {
          const current = prev[payload.room] ?? []
          const next = payload.isTyping
            ? current.includes(payload.userId)
              ? current
              : [...current, payload.userId]
            : current.filter((id) => id !== payload.userId)
          return { ...prev, [payload.room]: next }
        })
      }
    )

    socket.on(
      "presence_update",
      (payload: { room: string; online: string[] }) => {
        setOnline((prev) => ({ ...prev, [payload.room]: payload.online }))
      }
    )

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [hydrated, accessToken, myId])

  useEffect(() => {
    if (hydrated && accessToken) loadConvos()
  }, [hydrated, accessToken, loadConvos])

  // Leaving the chat page re-arms the badge (no room is "open" anymore).
  useEffect(
    () => () => {
      useChatUnread.getState().setActiveRoom(null)
    },
    []
  )

  // Auto-select first conversation
  useEffect(() => {
    if (!convos || activeRoomRef.current) return
    const first = convos.dms[0]?.room ?? convos.teams[0]?.room ?? null
    if (first) selectRoom(first)
  }, [convos, selectRoom])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Typing timer cleanup
  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    },
    []
  )

  // User search with debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await apiGet<ChatUser[]>(
          `/chat/users?query=${encodeURIComponent(q)}`
        )
        setSearchResults(data.filter((u) => u.id !== myId))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery, myId])

  const sendMessage = useCallback(async () => {
    const content = composer.trim()
    if (!content || !activeRoom || sending) return
    setSending(true)
    try {
      const res = await new Promise<Ack | undefined>((resolve, reject) => {
        const timer = setTimeout(() => resolve(undefined), 5000)
        socketRef.current?.emit(
          "send_message",
          { room: activeRoom, content },
          (ack: Ack) => {
            clearTimeout(timer)
            resolve(ack)
          }
        )
        socketRef.current?.once("disconnect", () => {
          clearTimeout(timer)
          reject(new Error("Disconnected"))
        })
      })
      if (res?.success === false) {
        throw new Error(res.error || "Failed to send")
      }
      setComposer("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }, [composer, activeRoom, sending])

  const handleComposerChange = useCallback(
    (value: string) => {
      setComposer(value)
      if (!activeRoom) return
      const now = Date.now()
      if (now - lastTypingEmitRef.current > 1500) {
        socketRef.current?.emit("typing", { room: activeRoom, isTyping: true })
        lastTypingEmitRef.current = now
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit("typing", { room: activeRoom, isTyping: false })
      }, 1200)
    },
    [activeRoom]
  )

  const startDm = useCallback(
    async (targetId: string) => {
      try {
        const res = await apiPost<{ room: string }>("/chat/dm", {
          userId: targetId,
        })
        setSearchQuery("")
        setSearchResults([])
        await loadConvos()
        selectRoom(res.room)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start DM")
      }
    },
    [loadConvos, selectRoom]
  )

  const activeRoomData = useMemo(() => {
    if (!convos || !activeRoom) return null
    const dm = convos.dms.find((d) => d.room === activeRoom)
    if (dm)
      return {
        type: "dm" as const,
        title: dm.user.name || dm.user.username,
        user: dm.user,
      }
    const team = convos.teams.find((t) => t.room === activeRoom)
    if (team)
      return { type: "team" as const, title: team.name, members: team.members }
    return null
  }, [convos, activeRoom])

  // userId -> display name, built from all known people
  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    if (!convos) return map
    for (const dm of convos.dms) {
      map.set(dm.user.id, dm.user.name || dm.user.username)
    }
    for (const t of convos.teams) {
      for (const m of t.members) {
        map.set(m.id, m.name || m.username)
      }
    }
    return map
  }, [convos])

  const onlineIds = activeRoom ? (online[activeRoom] ?? []) : []
  const typingNames = useMemo(() => {
    const ids = activeRoom ? (typingIds[activeRoom] ?? []) : []
    if (ids.length === 0) return []
    return ids.map((id) => nameById.get(id) ?? "Someone")
  }, [typingIds, activeRoom, nameById])

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left pane — search + conversations */}
      <div className="flex w-80 shrink-0 flex-col gap-3">
        <div className="relative">
          <Input
            placeholder="Search people to message…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-full border-slate-700 bg-slate-900/60 px-4 pr-10 text-slate-100 placeholder:text-slate-500 focus-visible:border-violet-500/70 focus-visible:ring-violet-500/30"
          />
          {searching && (
            <Loader2 className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {searchQuery.trim() && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/95 p-2 shadow-lg ring-1 ring-white/5">
            {searchResults.length === 0 && !searching ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">
                No users found
              </p>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startDm(u.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-800/70"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {initials(u.name, u.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.name || u.username}
                    </p>
                    {u.name && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{u.username}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-2 shadow-sm ring-1 ring-white/5">
          {convos && convos.dms.length > 0 && (
            <div>
              <h3 className="mb-1 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Direct
              </h3>
              {convos.dms.map((d) => {
                const unread = unreadByRoom[d.room] ?? 0
                return (
                  <button
                    key={d.room}
                    onClick={() => selectRoom(d.room)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-800/70 ${
                      activeRoom === d.room ? "bg-slate-800" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {initials(d.user.name, d.user.username)}
                        </AvatarFallback>
                      </Avatar>
                      {(online[d.room] ?? []).includes(d.user.id) && (
                        <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          unread > 0 ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {d.user.name || d.user.username}
                      </p>
                      {d.lastMessage && (
                        <p className="truncate text-xs text-muted-foreground">
                          {d.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-semibold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {convos && convos.teams.length > 0 && (
            <div>
              <h3 className="mb-1 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Teams
              </h3>
              {convos.teams.map((t) => {
                const unread = unreadByRoom[t.room] ?? 0
                return (
                  <button
                    key={t.room}
                    onClick={() => selectRoom(t.room)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-accent ${
                      activeRoom === t.room ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Users className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          unread > 0 ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {t.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.members.length}{" "}
                        {t.members.length === 1 ? "member" : "members"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-semibold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {convos && convos.dms.length === 0 && convos.teams.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground">
                Search for someone above to start
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right pane — messages */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm ring-1 ring-white/5">
        {activeRoomData ? (
          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/70 px-4 py-3">
            {activeRoomData.type === "dm" ? (
              <>
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {initials(
                        activeRoomData.user.name,
                        activeRoomData.user.username
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {onlineIds.includes(activeRoomData.user.id) && (
                    <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {activeRoomData.user.name || activeRoomData.user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {onlineIds.includes(activeRoomData.user.id)
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Users className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{activeRoomData.title}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    Team
                  </Badge>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Select a conversation
            </p>
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-950/70 px-4 py-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)]">
          {loadingConvo ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageCircle className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground">
                Send the first message below
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.senderId === myId
              const senderName =
                nameById.get(msg.senderId) ?? msg.senderId.slice(0, 8)
              // Collapse consecutive messages from the same sender.
              const prev: ChatMessage | undefined =
                i > 0 ? messages[i - 1] : undefined
              const grouped =
                prev !== undefined &&
                prev.senderId === msg.senderId &&
                !isMine &&
                new Date(msg.createdAt).getTime() -
                  new Date(prev.createdAt).getTime() <
                  5 * 60 * 1000
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    isMine ? "justify-end" : "justify-start"
                  } ${grouped ? "mt-0.5" : "mt-3"}`}
                >
                  {!isMine && (
                    <div className="w-7 shrink-0">
                      {!grouped && (
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">
                            {initials(senderName, senderName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-3.5 py-2 text-sm ring-1 ring-inset ${
                      isMine
                        ? "rounded-2xl rounded-br-md bg-violet-600 text-white shadow-sm shadow-violet-950/40 ring-violet-500/40"
                        : "rounded-2xl rounded-bl-md bg-slate-800 text-slate-100 ring-slate-700/70"
                    }`}
                  >
                    {!isMine && !grouped && (
                      <p className="mb-0.5 text-xs font-semibold text-violet-400">
                        {senderName}
                      </p>
                    )}
                    <p className="break-words whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMine ? "text-white/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          {typingNames.length > 0 && (
            <p className="text-xs text-muted-foreground italic">
              {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"}{" "}
              typing…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-800 bg-slate-900/70 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex items-center gap-2"
          >
            <Input
              placeholder={
                activeRoomData
                  ? activeRoomData.type === "dm"
                    ? `Message ${activeRoomData.user.name || activeRoomData.user.username}…`
                    : `Message ${activeRoomData.title}…`
                  : "Select a conversation"
              }
              value={composer}
              onChange={(e) => handleComposerChange(e.target.value)}
              disabled={!activeRoom || sending}
              className="h-10 flex-1 rounded-full border-slate-700 bg-slate-950/60 px-4 text-slate-100 placeholder:text-slate-500 focus-visible:border-violet-500/70 focus-visible:ring-violet-500/30"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-violet-600 text-white shadow-sm shadow-violet-950/40 hover:bg-violet-500"
              disabled={!activeRoom || !composer.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
