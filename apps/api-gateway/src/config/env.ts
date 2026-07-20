import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 6001,

  USER_SERVICE:
    process.env.USER_SERVICE || "http://user-service:3001",

  ORDER_SERVICE:
    process.env.ORDER_SERVICE || "http://order-service:3002",
};