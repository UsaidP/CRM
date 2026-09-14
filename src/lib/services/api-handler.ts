import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ApiHandlerOptions {
  fallbackMessage?: string;
}

/**
 * Maps uncaught errors into sanitized, structured JSON responses.
 * In production environments, unhandled 500 errors are masked to prevent
 * internal database, stack trace, and schema leakages.
 */
export function handleApiError(
  error: unknown,
  fallbackMessage: string = 'An unexpected internal error occurred'
): NextResponse {
  console.error('[API Handler]', error);

  // 1. Zod Validation Errors (400 Bad Request)
  if (error instanceof ZodError || (error && Array.isArray((error as any).issues))) {
    const issues = (error as any).issues || (error as any).errors || [];
    const formatted =
      issues
        .map((issue: any) => `${issue.path?.join('.') || 'field'}: ${issue.message}`)
        .join(', ') || 'Validation failed';

    return NextResponse.json({ success: false, error: formatted }, { status: 400 });
  }

  // 2. Explicit ApiError with status code
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  // 3. Duck-typed operational error with 4xx status
  const anyErr = error as any;
  if (
    anyErr &&
    typeof anyErr.statusCode === 'number' &&
    anyErr.statusCode >= 400 &&
    anyErr.statusCode < 500
  ) {
    return NextResponse.json(
      { success: false, error: anyErr.message || fallbackMessage },
      { status: anyErr.statusCode }
    );
  }

  // 4. Cross-tenant isolation violation (403 Forbidden)
  if (
    (error as Error)?.message === 'FORBIDDEN_CROSS_TENANT' ||
    anyErr?.message?.includes('FORBIDDEN_CROSS_TENANT')
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Access denied: Cannot access or associate data with another organization.',
      },
      { status: 403 }
    );
  }

  // 5. Prisma known errors
  if (anyErr?.code === 'P2002') {
    return NextResponse.json(
      {
        success: false,
        error: 'A record with these unique details already exists.',
      },
      { status: 409 }
    );
  }
  if (anyErr?.code === 'P2003') {
    return NextResponse.json(
      {
        success: false,
        error: 'Referenced record (such as organization or project) does not exist.',
      },
      { status: 400 }
    );
  }
  if (anyErr?.code === 'P2025') {
    return NextResponse.json(
      {
        success: false,
        error: 'The requested record was not found.',
      },
      { status: 404 }
    );
  }
  if (anyErr?.code === 'P2034') {
    return NextResponse.json(
      {
        success: false,
        error: 'A concurrent database transaction conflict occurred. Please retry.',
      },
      { status: 409 }
    );
  }

  // 6. Unhandled 500 Server Errors
  const isProduction = process.env.NODE_ENV === 'production';
  const rawMsg = (error as Error)?.message || '';
  const isSafeMessage =
    rawMsg.length > 0 &&
    rawMsg.length < 200 &&
    !rawMsg.includes('node_modules') &&
    !rawMsg.includes('prisma') &&
    !rawMsg.includes('Prisma') &&
    !rawMsg.includes('SELECT') &&
    !rawMsg.includes('INSERT') &&
    !rawMsg.includes('UPDATE') &&
    !rawMsg.includes('at ') &&
    !rawMsg.includes('ECONN');

  const errorMessage = isProduction
    ? (isSafeMessage ? rawMsg : fallbackMessage)
    : rawMsg || fallbackMessage;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      ...(isProduction ? {} : { stack: (error as Error)?.stack }),
    },
    { status: 500 }
  );
}

export type RouteHandler = (req: Request, context?: any) => Promise<Response | NextResponse>;

/**
 * Higher-order wrapper for Next.js App Router route handlers.
 * Wraps route execution in a standardized try/catch block.
 */
export function withApiHandler(
  handler: RouteHandler,
  options?: ApiHandlerOptions
): RouteHandler {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error, options?.fallbackMessage);
    }
  };
}
