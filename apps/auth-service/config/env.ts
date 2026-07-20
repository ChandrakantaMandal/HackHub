import "dotenv/config"

export const env = {
  PORT: Number(process.env.PORT ?? 6002),

  ACCESS_SECRET: process.env.ACCESS_SECRET!,

  REFRESH_SECRET: process.env.REFRESH_SECRET!,
}
