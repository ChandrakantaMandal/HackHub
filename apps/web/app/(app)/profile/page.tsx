"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Separator } from "@workspace/ui/components/separator"

import { useAppStore } from "@/store/useAppStore"
import { useHydrated } from "@/lib/useHydrated"
import { apiPatch, apiPost, ApiError } from "@/lib/client"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Could not read the file"))
    reader.readAsDataURL(file)
  })
}

function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.fields) return {}
  const flat: Record<string, string> = {}
  for (const [key, messages] of Object.entries(err.fields)) {
    const first = messages[0]
    if (first) flat[key] = first
  }
  return flat
}

export default function ProfilePage() {
  const hydrated = useHydrated()
  const profile = useAppStore((s) => s.user)

  if (!hydrated || !profile?.user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage how you appear across HackHub.
        </p>
      </div>
      {/* Remount on user.updatedAt so the form re-initializes after a save. */}
      <ProfileForm key={profile.user.updatedAt} profile={profile} />
    </div>
  )
}

type StoreProfile = NonNullable<ReturnType<typeof useAppStore.getState>["user"]>

function ProfileForm({ profile }: { profile: StoreProfile }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(profile.user.name ?? "")
  const [bio, setBio] = useState(profile.user.bio ?? "")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.user.avatar ?? null
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const displayName = name.trim() || profile.user.username || "You"
  const initial = displayName.charAt(0).toUpperCase()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Unsupported format", {
        description: "Use a JPEG, PNG, WebP or GIF image.",
      })
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("File too large", {
        description: "Avatar images must be 2MB or smaller.",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(reader.result as string)
      setAvatarFile(file)
      setAvatarRemoved(false)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    setAvatarFile(null)
    setAvatarRemoved(true)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)

    try {
      let nextProfile: StoreProfile | null = null

      // 1) Upload a new avatar (if one was picked) first so a failure here
      //    doesn't half-apply the rest of the form.
      if (avatarFile) {
        const dataUrl = await fileToDataUrl(avatarFile)
        const uploaded = await apiPost<StoreProfile>("/auth/avatar", {
          file: dataUrl,
          fileName: avatarFile.name,
        })
        nextProfile = uploaded
      }

      // 2) Persist name/bio (and avatar removal, when requested).
      const patch: {
        name?: string
        bio?: string | null
        avatar?: string | null
      } = {}
      if (name.trim() !== (profile.user.name ?? "")) patch.name = name.trim()
      if (bio.trim() !== (profile.user.bio ?? ""))
        patch.bio = bio.trim() || null
      if (avatarRemoved) patch.avatar = null

      if (Object.keys(patch).length > 0) {
        const updated = await apiPatch<StoreProfile>("/auth/profile", patch)
        nextProfile = updated
      }

      if (nextProfile) {
        useAppStore.setState({ user: nextProfile })
      }

      setAvatarFile(null)
      setAvatarRemoved(false)

      toast.success("Profile updated", {
        description: "Your changes have been saved.",
      })
    } catch (err) {
      const fields = fieldErrors(err)
      setErrors(fields)
      toast.error("Could not save profile", {
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Avatar card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 ring-1 ring-white/5">
        <h2 className="text-sm font-medium text-slate-200">Avatar</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar size="lg" className="h-16 w-16">
            {avatarPreview ? (
              <AvatarImage
                src={avatarPreview}
                alt={displayName}
                className="border-none"
              />
            ) : null}
            <AvatarFallback className="bg-violet-600/20 text-base font-semibold text-violet-300">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AVATAR_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              Change image
            </Button>
            {avatarPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-red-400"
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          JPEG, PNG, WebP or GIF — up to 2MB. Stored on ImageKit.
        </p>
      </div>

      {/* Details card */}
      <form
        onSubmit={handleSave}
        className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 ring-1 ring-white/5"
      >
        <h2 className="text-sm font-medium text-slate-200">Details</h2>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-300">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              aria-invalid={Boolean(errors.name)}
              className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-600 focus-visible:border-violet-500 focus-visible:ring-violet-500/40"
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-slate-300">
              Bio
            </Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short blurb about you (optional)"
              maxLength={280}
              rows={4}
              aria-invalid={Boolean(errors.bio)}
              className="flex w-full rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-2 text-sm text-slate-100 transition-colors outline-none placeholder:text-slate-600 focus-visible:border-violet-500 focus-visible:ring-3 focus-visible:ring-violet-500/40"
            />
            <div className="flex items-center justify-between">
              {errors.bio ? (
                <p className="text-xs text-red-400">{errors.bio}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-slate-600">{bio.length}/280</span>
            </div>
          </div>
        </div>

        <Separator className="my-5 bg-slate-800" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-slate-500">Email</Label>
            <Input
              value={profile.email}
              disabled
              className="border-slate-800 bg-slate-900/40 text-slate-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-500">Username</Label>
            <Input
              value={profile.user.username}
              disabled
              className="border-slate-800 bg-slate-900/40 text-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-violet-600 text-white hover:bg-violet-500"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </form>
    </>
  )
}
