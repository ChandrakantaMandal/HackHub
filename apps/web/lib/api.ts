import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/auth",
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("app-storage")
    if (stored) {
      try {
        const { state } = JSON.parse(stored)
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("app-storage")
        if (stored) {
          try {
            const { state } = JSON.parse(stored)
            if (state?.refreshToken && state?.sessionId) {
              const { data } = await axios.post(
                `${api.defaults.baseURL}/refresh`,
                {
                  refreshToken: state.refreshToken,
                  sessionId: state.sessionId,
                }
              )

              if (data.success) {
                const newAccessToken = data.data.accessToken
                const newRefreshToken = data.data.refreshToken

                localStorage.setItem(
                  "app-storage",
                  JSON.stringify({
                    state: {
                      ...state,
                      accessToken: newAccessToken,
                      refreshToken: newRefreshToken,
                    },
                  })
                )

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                return api(originalRequest)
              }
            }
          } catch {
            localStorage.removeItem("app-storage")
          }
        }
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred"

    return Promise.reject(new Error(message))
  }
)

export default api
