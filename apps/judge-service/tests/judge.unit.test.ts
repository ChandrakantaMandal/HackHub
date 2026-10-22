import { describe, it, expect, vi } from "vitest"
import {
  computeFinalScore,
  rankProjects,
  type LeaderboardRow,
} from "../libs/scoring"
import { scoreSchema, awardBadgeSchema } from "@workspace/utils"
import { requireJudge, userContext } from "../middleware/judge.middleware"

describe("computeFinalScore", () => {
  it("returns 100 for all criteria at 10", () => {
    expect(
      computeFinalScore({
        innovation: 10,
        technical: 10,
        design: 10,
        presentation: 10,
        overall: 10,
      })
    ).toBe(100)
  })

  it("returns 0 for all criteria at 0", () => {
    expect(
      computeFinalScore({
        innovation: 0,
        technical: 0,
        design: 0,
        presentation: 0,
        overall: 0,
      })
    ).toBe(0)
  })

  it("applies weighted formula and rounds to an integer", () => {
    // 8*.3 + 6*.25 + 7*.2 + 5*.1 + 9*.15 = 7.15 => 71.5 => 72
    expect(
      computeFinalScore({
        innovation: 8,
        technical: 6,
        design: 7,
        presentation: 5,
        overall: 9,
      })
    ).toBe(72)
  })

  it("weights innovation highest", () => {
    const highInnovation = computeFinalScore({
      innovation: 10,
      technical: 0,
      design: 0,
      presentation: 0,
      overall: 0,
    })
    const lowInnovation = computeFinalScore({
      innovation: 0,
      technical: 10,
      design: 10,
      presentation: 10,
      overall: 10,
    })
    expect(highInnovation).toBe(30)
    expect(lowInnovation).toBe(70)
  })
})

describe("rankProjects", () => {
  it("groups scores per project and averages them", () => {
    const rows: LeaderboardRow[] = [
      { projectId: "p1", title: "Alpha", finalScore: 80 },
      { projectId: "p1", title: "Alpha", finalScore: 60 },
      { projectId: "p2", title: "Beta", finalScore: 90 },
    ]

    const result = rankProjects(rows)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      rank: 1,
      projectId: "p2",
      title: "Beta",
      averageScore: 90,
      scoreCount: 1,
    })
    expect(result[1]).toEqual({
      rank: 2,
      projectId: "p1",
      title: "Alpha",
      averageScore: 70,
      scoreCount: 2,
    })
  })

  it("breaks average ties by score count, then by title", () => {
    const rows: LeaderboardRow[] = [
      { projectId: "p1", title: "Zeta", finalScore: 90 },
      { projectId: "p2", title: "Alpha", finalScore: 90 },
      { projectId: "p3", title: "Beta", finalScore: 90 },
      { projectId: "p4", title: "Mid", finalScore: 50 },
      { projectId: "p4", title: "Mid", finalScore: 50 },
    ]

    const result = rankProjects(rows)
    expect(result.map((e) => e.projectId)).toEqual(["p2", "p3", "p1", "p4"])

    const withCount: LeaderboardRow[] = [
      { projectId: "p5", title: "Solo", finalScore: 90 },
      { projectId: "p6", title: "Crowd", finalScore: 90 },
      { projectId: "p6", title: "Crowd", finalScore: 90 },
    ]
    const countResult = rankProjects(withCount)
    expect(countResult[0].projectId).toBe("p6")
    expect(countResult[0].scoreCount).toBe(2)
  })

  it("assigns sequential ranks", () => {
    const rows: LeaderboardRow[] = [
      { projectId: "a", title: "A", finalScore: 30 },
      { projectId: "b", title: "B", finalScore: 20 },
      { projectId: "c", title: "C", finalScore: 10 },
    ]

    expect(rankProjects(rows).map((e) => e.rank)).toEqual([1, 2, 3])
  })

  it("returns an empty list for no scores", () => {
    expect(rankProjects([])).toEqual([])
  })
})

describe("scoreSchema", () => {
  const validScore = {
    innovation: 8,
    technical: 6,
    design: 7,
    presentation: 5,
    overall: 9,
    feedback: "Solid work",
  }

  it("accepts integer scores within 0-10", () => {
    expect(scoreSchema.safeParse(validScore).success).toBe(true)
    expect(
      scoreSchema.safeParse({ ...validScore, feedback: undefined }).success
    ).toBe(true)
  })

  it("rejects scores above 10", () => {
    const result = scoreSchema.safeParse({ ...validScore, innovation: 11 })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer scores", () => {
    const result = scoreSchema.safeParse({ ...validScore, technical: 7.5 })
    expect(result.success).toBe(false)
  })

  it("rejects negative scores", () => {
    const result = scoreSchema.safeParse({ ...validScore, design: -1 })
    expect(result.success).toBe(false)
  })

  it("requires all five criteria", () => {
    const { innovation, ...missing } = validScore
    const result = scoreSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })
})

describe("awardBadgeSchema", () => {
  it("accepts a valid badge", () => {
    expect(
      awardBadgeSchema.safeParse({ name: "Best UI", description: "Great" })
        .success
    ).toBe(true)
  })

  it("requires a badge name", () => {
    expect(awardBadgeSchema.safeParse({ name: "" }).success).toBe(false)
    expect(awardBadgeSchema.safeParse({}).success).toBe(false)
  })

  it("rejects a name longer than 100 chars", () => {
    expect(awardBadgeSchema.safeParse({ name: "x".repeat(101) }).success).toBe(
      false
    )
  })
})

const mockRes = () => {
  const res: any = { statusCode: 200, body: undefined }
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })
  res.json = vi.fn((payload: any) => {
    res.body = payload
    return res
  })
  return res
}

describe("requireJudge", () => {
  it("allows the exact JUDGE role", () => {
    const next = vi.fn()
    const res = mockRes()

    requireJudge({ user: { id: "u1", role: "JUDGE" } } as any, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it.each(["PARTICIPANT", "ADMIN", "user", undefined])(
    "rejects role %s with 403",
    (role) => {
      const next = vi.fn()
      const res = mockRes()
      const req: any = role === undefined ? {} : { user: { id: "u1", role } }

      requireJudge(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.body).toEqual({
        success: false,
        error: "Forbidden: Judge role required",
      })
    }
  )
})

describe("userContext", () => {
  it("fail-closes without identity headers", () => {
    const next = vi.fn()
    const res = mockRes()

    userContext({ headers: {} } as any, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({
      success: false,
      error: "Unauthorized: Missing user context",
    })
  })

  it("populates req.user from gateway headers", () => {
    const next = vi.fn()
    const res = mockRes()
    const req: any = {
      headers: { "x-user-id": "u1", "x-user-role": "JUDGE" },
    }

    userContext(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toEqual({ id: "u1", role: "JUDGE" })
  })
})
