import { Request, Response, NextFunction } from "express"
import * as showcaseService from "../services/showcase.service"
import { listQuerySchema, commentSchema } from "../libs/showcaseSchemas"

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        fields: parsed.error.flatten().fieldErrors,
      })
    }

    const data = await showcaseService.listProjects(parsed.data)
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const getProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await showcaseService.getProject(String(req.params.id))
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const toggleLike = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.id
    const data = await showcaseService.toggleLike(String(req.params.id), userId)
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.id
    const parsed = commentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        fields: parsed.error.flatten().fieldErrors,
      })
    }

    const data = await showcaseService.createComment(
      String(req.params.id),
      userId,
      parsed.data.message
    )
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await showcaseService.getComments(String(req.params.id))
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const leaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await showcaseService.getLeaderboard()
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const stats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await showcaseService.getStats()
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}
