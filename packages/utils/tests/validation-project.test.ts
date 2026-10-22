import { describe, it, expect } from "vitest"
import {
  createTeamSchema,
  joinTeamSchema,
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
} from "../src/validation/project"

describe("createTeamSchema", () => {
  it("accepts valid input", () => {
    expect(
      createTeamSchema.safeParse({ name: "Alpha Team", userId: "user-1" })
        .success
    ).toBe(true)
  })

  it("rejects team name shorter than 2 chars", () => {
    expect(
      createTeamSchema.safeParse({ name: "A", userId: "user-1" }).success
    ).toBe(false)
  })

  it("rejects missing userId", () => {
    expect(createTeamSchema.safeParse({ name: "Alpha Team" }).success).toBe(
      false
    )
  })

  it("rejects missing name", () => {
    expect(createTeamSchema.safeParse({ userId: "user-1" }).success).toBe(false)
  })
})

describe("joinTeamSchema", () => {
  it("accepts a 6-char invite code", () => {
    expect(
      joinTeamSchema.safeParse({ inviteCode: "ABC123", userId: "user-1" })
        .success
    ).toBe(true)
  })

  it("rejects invite code shorter than 6 chars", () => {
    expect(
      joinTeamSchema.safeParse({ inviteCode: "ABC12", userId: "user-1" })
        .success
    ).toBe(false)
  })

  it("rejects invite code longer than 6 chars", () => {
    expect(
      joinTeamSchema.safeParse({ inviteCode: "ABC1234", userId: "user-1" })
        .success
    ).toBe(false)
  })

  it("rejects missing userId", () => {
    expect(joinTeamSchema.safeParse({ inviteCode: "ABC123" }).success).toBe(
      false
    )
  })
})

describe("createProjectSchema", () => {
  const validProject = {
    title: "Sky Ledger",
    description: "A finance tracker for teams",
    category: "FinTech",
    tags: ["typescript", "ai"],
    teamId: "team-1",
    hackathonId: "3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8",
  }

  it("accepts valid input", () => {
    expect(createProjectSchema.safeParse(validProject).success).toBe(true)
  })

  it("rejects title shorter than 3 chars", () => {
    expect(
      createProjectSchema.safeParse({ ...validProject, title: "ab" }).success
    ).toBe(false)
  })

  it("rejects description shorter than 10 chars", () => {
    expect(
      createProjectSchema.safeParse({
        ...validProject,
        description: "too short",
      }).success
    ).toBe(false)
  })

  it("rejects tags that are not an array", () => {
    expect(
      createProjectSchema.safeParse({ ...validProject, tags: "typescript" })
        .success
    ).toBe(false)
  })

  it("rejects missing teamId", () => {
    const { teamId: _teamId, ...withoutTeam } = validProject
    expect(createProjectSchema.safeParse(withoutTeam).success).toBe(false)
  })

  it("rejects missing category", () => {
    const { category: _category, ...withoutCategory } = validProject
    expect(createProjectSchema.safeParse(withoutCategory).success).toBe(false)
  })

  it("rejects missing hackathonId", () => {
    const { hackathonId: _hackathonId, ...withoutHackathon } = validProject
    expect(createProjectSchema.safeParse(withoutHackathon).success).toBe(false)
  })

  it("rejects a non-uuid hackathonId", () => {
    expect(
      createProjectSchema.safeParse({ ...validProject, hackathonId: "h1" })
        .success
    ).toBe(false)
  })
})

describe("updateProjectSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(true)
  })

  it("accepts a valid title update", () => {
    expect(updateProjectSchema.safeParse({ title: "New Title" }).success).toBe(
      true
    )
  })

  it("rejects short title", () => {
    expect(updateProjectSchema.safeParse({ title: "ab" }).success).toBe(false)
  })

  it("rejects short description", () => {
    expect(
      updateProjectSchema.safeParse({ description: "too short" }).success
    ).toBe(false)
  })
})

describe("createTaskSchema", () => {
  it("accepts title only", () => {
    expect(createTaskSchema.safeParse({ title: "Build auth" }).success).toBe(
      true
    )
  })

  it("accepts title with optional fields", () => {
    expect(
      createTaskSchema.safeParse({
        title: "Build auth",
        description: "JWT flow",
        assignedTo: "user-1",
      }).success
    ).toBe(true)
  })

  it("rejects empty title", () => {
    expect(createTaskSchema.safeParse({ title: "" }).success).toBe(false)
  })

  it("rejects missing title", () => {
    expect(createTaskSchema.safeParse({}).success).toBe(false)
  })
})

describe("updateTaskSchema", () => {
  it("accepts empty patch", () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(true)
  })

  it.each(["todo", "in_progress", "completed"] as const)(
    "accepts status %s",
    (status) => {
      expect(updateTaskSchema.safeParse({ status }).success).toBe(true)
    }
  )

  it("rejects unknown status", () => {
    expect(updateTaskSchema.safeParse({ status: "done" }).success).toBe(false)
  })

  it("accepts assignedTo null", () => {
    expect(updateTaskSchema.safeParse({ assignedTo: null }).success).toBe(true)
  })

  it("rejects empty title", () => {
    expect(updateTaskSchema.safeParse({ title: "" }).success).toBe(false)
  })
})
