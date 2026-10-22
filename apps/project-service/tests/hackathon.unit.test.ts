import { describe, it, expect, vi, beforeEach } from "vitest"
import { AppError } from "@workspace/error-handler"
import hackathonService from "../services/hackathon.service"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    hackathon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    hackathonRegistration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock("@workspace/database", () => ({
  default: mockPrisma,
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}))

vi.mock("@workspace/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  httpLogger: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

const H_ID = "11111111-1111-4111-8111-111111111111"

function makeHackathon(overrides: Record<string, unknown> = {}) {
  return {
    id: H_ID,
    name: "Spring Hack",
    tagline: "Build things",
    description: "A hackathon",
    location: "Online",
    startDate: new Date("2026-11-01"),
    endDate: new Date("2026-11-03"),
    registrationDeadline: new Date("2026-10-31"),
    allowJoin: true,
    maxTeamSize: 4,
    status: "ACTIVE",
    joinCode: "ABCDEF",
    ...overrides,
  }
}

async function expectRejection(
  promise: Promise<unknown>,
  statusCode: number,
  message: string
) {
  const error = await promise.then(
    () => {
      throw new Error("Expected promise to reject, but it resolved")
    },
    (reason: unknown) => reason
  )
  expect(error).toBeInstanceOf(AppError)
  expect((error as AppError).statusCode).toBe(statusCode)
  expect((error as Error).message).toBe(message)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("hackathonService.listActive", () => {
  it("lists only ACTIVE hackathons with participant counts and no join code", async () => {
    const hackathon = makeHackathon()
    mockPrisma.hackathon.findMany.mockResolvedValue([
      { ...hackathon, _count: { registrations: 7 } },
    ])

    const result = await hackathonService.listActive()

    expect(mockPrisma.hackathon.findMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "asc" },
      include: { _count: { select: { registrations: true } } },
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: H_ID,
      participantCount: 7,
      registered: false,
      isRegistrationOpen: true,
    })
    expect(result[0]).not.toHaveProperty("joinCode")
  })

  it("marks registered hackathons when a userId is provided", async () => {
    mockPrisma.hackathon.findMany.mockResolvedValue([
      { ...makeHackathon(), _count: { registrations: 3 } },
      {
        ...makeHackathon({ id: "22222222-2222-4222-8222-222222222222" }),
        _count: { registrations: 1 },
      },
    ])
    mockPrisma.hackathonRegistration.findMany.mockResolvedValue([
      { hackathonId: H_ID },
    ])

    const result = await hackathonService.listActive("acc-1")

    expect(mockPrisma.hackathonRegistration.findMany).toHaveBeenCalledWith({
      where: {
        userId: "acc-1",
        hackathonId: { in: [H_ID, "22222222-2222-4222-8222-222222222222"] },
      },
      select: { hackathonId: true },
    })
    expect(result[0].registered).toBe(true)
    expect(result[1].registered).toBe(false)
  })

  it("flags closed registrations when the deadline has passed", async () => {
    mockPrisma.hackathon.findMany.mockResolvedValue([
      {
        ...makeHackathon({ registrationDeadline: new Date("2026-01-01") }),
        _count: { registrations: 0 },
      },
    ])

    const result = await hackathonService.listActive()

    expect(result[0].isRegistrationOpen).toBe(false)
  })

  it("skips the registration lookup when there are no hackathons", async () => {
    mockPrisma.hackathon.findMany.mockResolvedValue([])

    const result = await hackathonService.listActive("acc-1")

    expect(result).toEqual([])
    expect(mockPrisma.hackathonRegistration.findMany).not.toHaveBeenCalled()
  })
})

describe("hackathonService.listMine", () => {
  it("returns the caller's registered hackathons as public rows", async () => {
    mockPrisma.hackathonRegistration.findMany.mockResolvedValue([
      {
        hackathon: { ...makeHackathon(), _count: { registrations: 5 } },
      },
    ])

    const result = await hackathonService.listMine("acc-1")

    expect(mockPrisma.hackathonRegistration.findMany).toHaveBeenCalledWith({
      where: { userId: "acc-1" },
      orderBy: { registeredAt: "desc" },
      include: {
        hackathon: {
          include: { _count: { select: { registrations: true } } },
        },
      },
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: H_ID,
      participantCount: 5,
      registered: true,
    })
    expect(result[0]).not.toHaveProperty("joinCode")
  })
})

describe("hackathonService.register", () => {
  it("rejects an invalid hackathon id with 400", async () => {
    await expectRejection(
      hackathonService.register("acc-1", "not-a-uuid"),
      400,
      "Invalid hackathon id"
    )
    expect(mockPrisma.hackathon.findUnique).not.toHaveBeenCalled()
  })

  it("rejects when the hackathon does not exist with 404", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(null)

    await expectRejection(
      hackathonService.register("acc-1", H_ID),
      404,
      "Hackathon not found"
    )
  })

  it("rejects when the hackathon is not ACTIVE", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(
      makeHackathon({ status: "UPCOMING" })
    )

    await expectRejection(
      hackathonService.register("acc-1", H_ID),
      400,
      "This hackathon is not accepting registrations"
    )
    expect(mockPrisma.hackathonRegistration.create).not.toHaveBeenCalled()
  })

  it("rejects when joining is disabled", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(
      makeHackathon({ allowJoin: false })
    )

    await expectRejection(
      hackathonService.register("acc-1", H_ID),
      400,
      "Joining is disabled for this hackathon"
    )
  })

  it("rejects when the registration deadline has passed", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(
      makeHackathon({ registrationDeadline: new Date("2026-01-01") })
    )

    await expectRejection(
      hackathonService.register("acc-1", H_ID),
      400,
      "Registration deadline has passed"
    )
  })

  it("rejects a duplicate registration with 409 (P2002 race)", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(makeHackathon())
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
    })
    mockPrisma.hackathonRegistration.create.mockRejectedValue(p2002)

    await expectRejection(
      hackathonService.register("acc-1", H_ID),
      409,
      "You are already registered for this hackathon"
    )
  })

  it("creates the registration and returns the public payload", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(makeHackathon())
    mockPrisma.hackathonRegistration.create.mockResolvedValue({
      userId: "acc-1",
      hackathonId: H_ID,
    })
    mockPrisma.hackathonRegistration.count.mockResolvedValue(4)

    const result = await hackathonService.register("acc-1", H_ID)

    expect(mockPrisma.hackathonRegistration.create).toHaveBeenCalledWith({
      data: { userId: "acc-1", hackathonId: H_ID },
    })
    expect(mockPrisma.hackathonRegistration.count).toHaveBeenCalledWith({
      where: { hackathonId: H_ID },
    })
    expect(result).toMatchObject({
      id: H_ID,
      participantCount: 4,
      registered: true,
      isRegistrationOpen: true,
    })
    expect(result).not.toHaveProperty("joinCode")
  })
})

describe("hackathonService.registerByCode", () => {
  it("rejects an unknown join code with 404", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(null)

    await expectRejection(
      hackathonService.registerByCode("acc-1", "ZZZZZZ"),
      404,
      "Invalid join code"
    )
    expect(mockPrisma.hackathonRegistration.create).not.toHaveBeenCalled()
  })

  it("normalizes the join code (trim + uppercase) before lookup", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(
      makeHackathon({ status: "UPCOMING" })
    )

    await hackathonService.registerByCode("acc-1", "  abcdef ").catch(() => {})

    expect(mockPrisma.hackathon.findUnique).toHaveBeenCalledWith({
      where: { joinCode: "ABCDEF" },
    })
  })

  it("creates the registration and returns the public payload", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(makeHackathon())
    mockPrisma.hackathonRegistration.create.mockResolvedValue({
      userId: "acc-1",
      hackathonId: H_ID,
    })
    mockPrisma.hackathonRegistration.count.mockResolvedValue(2)

    const result = await hackathonService.registerByCode("acc-1", "abcdef")

    expect(mockPrisma.hackathonRegistration.create).toHaveBeenCalledWith({
      data: { userId: "acc-1", hackathonId: H_ID },
    })
    expect(result).toMatchObject({
      id: H_ID,
      participantCount: 2,
      registered: true,
    })
    expect(result).not.toHaveProperty("joinCode")
  })

  it("rejects when the deadline has passed", async () => {
    mockPrisma.hackathon.findUnique.mockResolvedValue(
      makeHackathon({ registrationDeadline: new Date("2026-01-01") })
    )

    await expectRejection(
      hackathonService.registerByCode("acc-1", "abcdef"),
      400,
      "Registration deadline has passed"
    )
  })
})
