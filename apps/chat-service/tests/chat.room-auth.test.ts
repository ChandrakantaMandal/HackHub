import { describe, it, expect, vi } from "vitest"
import { parseRoomName, authorizeRoomAccess, dmRoomName } from "../libs/rooms"

const TEAM_ID = "11111111-1111-4111-8111-111111111111"
const JUDGE_ID = "22222222-2222-4222-8222-222222222222"
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const STRANGER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const DM_ROOM = dmRoomName(USER_A, USER_B)

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

  it("parses a canonical DM room", () => {
    expect(parseRoomName(DM_ROOM)).toEqual({
      kind: "dm",
      userA: USER_A,
      userB: USER_B,
    })
  })

  it("rejects a DM with reversed (non-canonical) ids", () => {
    expect(parseRoomName(`dm_${USER_B}_${USER_A}`)).toBeNull()
  })

  it("rejects a self DM", () => {
    expect(parseRoomName(`dm_${USER_A}_${USER_A}`)).toBeNull()
  })

  it("rejects a DM with a non-uuid participant", () => {
    expect(parseRoomName(`dm_${USER_A}_notauuid`)).toBeNull()
  })

  it("rejects a DM with uppercase ids (not canonical)", () => {
    expect(parseRoomName(`dm_${USER_A.toUpperCase()}_${USER_B}`)).toBeNull()
  })

  it("dmRoomName is order-independent and lowercases", () => {
    expect(dmRoomName(USER_B, USER_A)).toBe(DM_ROOM)
    expect(dmRoomName(USER_A.toUpperCase(), USER_B)).toBe(DM_ROOM)
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

  it("allows a participant into their DM room without a membership check", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(db, DM_ROOM, USER_A, "PARTICIPANT")
    expect(result).toEqual({
      ok: true,
      identity: { kind: "dm", userA: USER_A, userB: USER_B },
    })
    expect(db.teamMember.findUnique).not.toHaveBeenCalled()
  })

  it("rejects a stranger from a DM room", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(
      db,
      DM_ROOM,
      STRANGER,
      "PARTICIPANT"
    )
    expect(result).toEqual({
      ok: false,
      error: "Not a participant of this conversation",
    })
  })

  it("rejects a non-canonical DM room name", async () => {
    const db = makeDb(false)
    const result = await authorizeRoomAccess(
      db,
      `dm_${USER_B}_${USER_A}`,
      USER_A,
      "PARTICIPANT"
    )
    expect(result).toEqual({ ok: false, error: "Invalid room name" })
  })
})
