import { Request, Response, NextFunction } from "express"

import { AppError } from "./AppError"
import { logger } from "@workspace/logger"

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn({
      message: err.message,
      statusCode: err.statusCode,
      path: req.originalUrl,
      method: req.method,
    })

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details !== undefined && {
        details: err.details,
      }),
    })
  }

  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  })

  return res.status(500).json({
    success: false,
    message: "Internal server error. Please try again later.",
  })
}
