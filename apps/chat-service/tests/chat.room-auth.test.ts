import { describe, it, expect, vi } from "vitest"
import { parseRoomName, authorizeRoomAccess } from "../libs/rooms"

const TEAM_ID = "11111111-1111-4111-8111-111111111111"
const JUDGE_ID = "22222222-2222-4222-8222-222222222222"

const makeDb = (isMember: boolean) => ({
  teamMember: {
    findUnique: vi
      .fn()
      .mockResolvedValue(isMember ? { teamId: TEAM_ID, userId: "u1" } : null),
  },
})

describe("parseRoomName", () => {
  it("parses a team room", () => {
    expect(parseRoomName(`team_${TEAM_ID}`)).toEqual({
      kind: "team",
      teamId: TEAM_ID,
    })
  })

  it("parses a global judge room", () => {
    expect(parseRoomName("judge")).toEqual({ kind: "judge" })
  })

  it("parses a prefixed judge room", () => {
    expect(parseRoomName("judge_hack123")).toEqual({ kind: "judge" })
  })

  it("parses a direct channel room", () => {
    expect(parseRoomName(`channel_${TEAM_ID}_${JUDGE_ID}`)).toEqual({
      kind: "direct",
      teamId: TEAM_ID,
      judgeId: JUDGE_ID,
    })
  })

  it("rejects a team room with invalid UUID", () => {
    expect(parseRoomName("team_not-a-uuid")).toBeNull()
  })

  it("rejects a direct channel with missing judgeId", () => {
    expect(parseRoomName(`channel_${TEAM_ID}_`)).toBeNull()
  })

  it("rejects an unknown room name", () => {
    expect(parseRoomName("random_room")).toBeNull()
  })
})

describe("authorizeRoomAccess", () => {
  it("allows a JUDGE into a judge room", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(db, "judge", "j1", "JUDGE")
    expect(result).toEqual({ ok: true, identity: { kind: "judge" } })
  })

  it("rejects a PARTICIPANT from a judge room", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(db, "judge", "u1", "PARTICIPANT")
    expect(result.ok).toBe(false)
  })

  it("allows a team member into a team room", async () => {
    const db = makeDb(true)
    const result = await authorizeRoomAccess(
      db,
      `team_${TEAM_ID}`,
      "u1",
      "PARTICIPANT"
    )
    expect(result.ok).toBe(true)
    expect(result).toMatchObject({
      identity: { kind: "team", teamId: TEAM_ID },
    })
  })

  it("rejects a non-member from a team room", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(
      db,
      `team_${TEAM_ID}`,
      "u1",
      "PARTICIPANT"
    )
    expect(result.ok).toBe(false)
  })

  it("allows the judge into their direct channel", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(
      db,
      `channel_${TEAM_ID}_${JUDGE_ID}`,
      JUDGE_ID,
      "JUDGE"
    )
    expect(result.ok).toBe(true)
    expect(result).toMatchObject({
      identity: { kind: "direct", teamId: TEAM_ID, judgeId: JUDGE_ID },
    })
  })

  it("rejects a PARTICIPANT impersonating the judge in a direct channel", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(
      db,
      `channel_${TEAM_ID}_${JUDGE_ID}`,
      JUDGE_ID,
      "PARTICIPANT"
    )
    expect(result.ok).toBe(false)
  })

  it("allows a team member into a direct channel", async () => {
    const db = makeDb(true)
    const result = await authorizeRoomAccess(
      db,
      `channel_${TEAM_ID}_${JUDGE_ID}`,
      "u1",
      "PARTICIPANT"
    )
    expect(result.ok).toBe(true)
  })

  it("rejects a stranger from a direct channel", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(
      db,
      `channel_${TEAM_ID}_${JUDGE_ID}`,
      "u1",
      "PARTICIPANT"
    )
    expect(result.ok).toBe(false)
  })

  it("rejects an invalid room name", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(db, "nope", "u1", "JUDGE")
    expect(result).toEqual({ ok: false, error: "Invalid room name" })
  })
})
