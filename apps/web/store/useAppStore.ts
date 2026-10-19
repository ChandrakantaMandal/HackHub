import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import api from "../lib/api"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  sessionId: string | null
  user: {
    id: string
    email: string
    user: { username: string }
  } | null

  isLoading: boolean
  error: string | null
  message: string | null
  hasHydrated: boolean

  login: (email: string, password: string) => Promise<void>
  register: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  verifyEmail: (email: string, otp: string) => Promise<void>
  resetPassword: (
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  clearMessage: () => void
  setHasHydrated: (hydrated: boolean) => void
}

export const useAppStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      user: null,

      isLoading: false,
      error: null,
      message: null,
      hasHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null, message: null })
        try {
          const { data } = await api.post("/login", { email, password })

          const { accessToken, refreshToken, sessionId } = data.data

          set({
            accessToken,
            refreshToken,
            sessionId,
            isLoading: false,
          })

          // Fetch profile
          try {
            const profileRes = await api.get("/profile")
            set({ user: profileRes.data.data })
          } catch {
            // Profile fetch failed, but login succeeded
          }
        } catch (err) {
          set({
            isLoading: false,
            error:
              err instanceof Error && err.message
                ? err.message
                : "An unexpected error occurred",
          })
          throw err
        }
      },

      register: async (
        username: string,
        email: string,
        password: string,
        confirmPassword: string
      ) => {
        set({ isLoading: true, error: null, message: null })
        try {
          await api.post("/register", {
            username,
            email,
            password,
            confirmPassword,
          })

          localStorage.setItem("pendingVerificationEmail", email)

          set({
            isLoading: false,
            message: "Account created. Please check your email for OTP.",
          })
        } catch (err) {
          set({
            isLoading: false,
            error:
              err instanceof Error && err.message
                ? err.message
                : "An unexpected error occurred",
          })
          throw err
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null, message: null })
        try {
          await api.post("/send-otp", { email, purpose: "reset" })

          localStorage.setItem("pendingResetEmail", email)

          set({
            isLoading: false,
            message: "OTP sent to your email",
          })
        } catch (err) {
          set({
            isLoading: false,
            error:
              err instanceof Error && err.message
                ? err.message
                : "An unexpected error occurred",
          })
          throw err
        }
      },

      verifyEmail: async (email: string, otp: string) => {
        set({ isLoading: true, error: null, message: null })
        try {
          await api.post("/verify-otp", { email, otp, purpose: "register" })

          localStorage.removeItem("pendingVerificationEmail")

          set({
            isLoading: false,
            message: "Email verified successfully",
          })
        } catch (err) {
          set({
            isLoading: false,
            error:
              err instanceof Error && err.message
                ? err.message
                : "An unexpected error occurred",
          })
          throw err
        }
      },

      resetPassword: async (
        email: string,
        otp: string,
        newPassword: string,
        confirmPassword: string
      ) => {
        set({ isLoading: true, error: null, message: null })
        try {
          await api.post("/reset-password", {
            email,
            otp,
            newPassword,
            confirmPassword,
          })

          localStorage.removeItem("pendingResetEmail")

          set({
            isLoading: false,
            message: "Password reset successfully",
          })
        } catch (err) {
          set({
            isLoading: false,
            error:
              err instanceof Error && err.message
                ? err.message
                : "An unexpected error occurred",
          })
          throw err
        }
      },

      logout: async () => {
        try {
          const stored = localStorage.getItem("app-storage")
          if (stored) {
            const { state } = JSON.parse(stored)
            if (state?.sessionId) {
              await api.post("/logout", { sessionId: state.sessionId })
            }
          }
        } catch {
          // logout best-effort
        } finally {
          set({
            accessToken: null,
            refreshToken: null,
            sessionId: null,
            user: null,
            error: null,
            message: null,
          })
        }
      },

      clearError: () => set({ error: null }),
      clearMessage: () => set({ message: null }),
      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
