import { Request, Response, NextFunction } from "express"

import * as authService from "../services/auth.service"

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await authService.register(req.body)

    res.status(201).json({
      success: true,
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await authService.refresh(req.cookies.refreshToken)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie("refreshToken")

  res.json({
    success: true,
    message: "Logged out",
  })
}
