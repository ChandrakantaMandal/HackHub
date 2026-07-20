import { AppError } from "./AppError"

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, 400, true, details)
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request data", details?: unknown) {
    super(message, 400, true, details)
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden access") {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409)
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database error", details?: unknown) {
    super(message, 500, true, details)
  }
}
