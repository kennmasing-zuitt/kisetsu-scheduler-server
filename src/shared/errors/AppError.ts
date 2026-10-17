/**
 * Domain error thrown by services and resolvers.
 * `code` becomes `extensions.code` in the GraphQL response; `status` is the HTTP-equivalent
 * status, exposed as `extensions.status` so clients that used the REST API can keep their logic.
 */
export class AppError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Invalid input', details?: unknown) {
        super(400, 'VALIDATION_ERROR', message, details);
    }
}

export class UnauthenticatedError extends AppError {
    constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
        super(401, code, message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'You do not have permission to do this', code = 'FORBIDDEN') {
        super(403, code, message);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', details?: unknown) {
        super(404, 'NOT_FOUND', message, details);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict', code = 'CONFLICT', details?: unknown) {
        super(409, code, message, details);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests. Try again later.') {
        super(429, 'TOO_MANY_REQUESTS', message);
    }
}
