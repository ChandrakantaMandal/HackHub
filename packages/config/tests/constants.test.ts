import { describe, it, expect } from "vitest"
import { APP_NAME, API_ROUTES, ROLES } from "../src/constants"

describe("constants", () => {
  it("exposes the app name", () => {
    expect(APP_NAME).toBe("HackHub")
  })

  it("exposes API routes", () => {
    expect(API_ROUTES).toEqual({ AUTH: "/auth", USERS: "/users" })
  })

  it("exposes roles", () => {
    expect(ROLES).toEqual({ ADMIN: "admin", USER: "user" })
  })
})
