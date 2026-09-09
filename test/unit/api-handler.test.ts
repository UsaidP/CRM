import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { z } from 'zod';
import { withApiHandler, handleApiError, ApiError } from '@/lib/services/api-handler';
import { NextResponse } from 'next/server';

describe('API Handler Seam (Candidate #5 - Error Masking)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('passes through successful responses unmodified', async () => {
    const handler = withApiHandler(async () => {
      return NextResponse.json({ success: true, message: 'ok' }, { status: 200 });
    });

    const req = new Request('http://localhost:3000/api/test');
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('ok');
  });

  it('formats Zod validation errors into 400 with path descriptions', async () => {
    const schema = z.object({
      projectName: z.string().min(3, 'Project name must be at least 3 characters'),
      price: z.number().positive('Price must be positive'),
    });

    const handler = withApiHandler(async () => {
      schema.parse({ projectName: 'A', price: -500 });
      return NextResponse.json({ success: true });
    });

    const req = new Request('http://localhost:3000/api/test');
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('projectName: Project name must be at least 3 characters');
    expect(json.error).toContain('price: Price must be positive');
  });

  it('formats custom ApiError with specified statusCode', async () => {
    const handler = withApiHandler(async () => {
      throw new ApiError('You are not authorized to reassign this broker', 403, { code: 'FORBIDDEN_SCOPE' });
    });

    const req = new Request('http://localhost:3000/api/test');
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe('You are not authorized to reassign this broker');
    expect(json.details).toEqual({ code: 'FORBIDDEN_SCOPE' });
  });

  it('maps Prisma P2002 duplicate key constraint to 409 Conflict', async () => {
    const handler = withApiHandler(async () => {
      const prismaErr = new Error('Unique constraint failed on the fields: (reraNumber, organizationId)');
      (prismaErr as any).code = 'P2002';
      throw prismaErr;
    });

    const req = new Request('http://localhost:3000/api/test');
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error).toBe('A record with these unique details already exists.');
  });

  it('masks internal server errors in production mode (prevents leakages)', async () => {
    process.env.NODE_ENV = 'production';

    const handler = withApiHandler(
      async () => {
        throw new Error('FATAL: password authentication failed for user "postgres" at host 10.0.1.5');
      },
      { fallbackMessage: 'Failed to process inventory operation' }
    );

    const req = new Request('http://localhost:3000/api/test');
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    // Sensitive DB credentials or connection strings must NOT be exposed
    expect(json.error).toBe('Failed to process inventory operation');
    expect(json.error).not.toContain('postgres');
    expect(json.stack).toBeUndefined();
  });

  it('returns developer-friendly error message in non-production environments', async () => {
    process.env.NODE_ENV = 'development';

    const handler = withApiHandler(async () => {
      throw new Error('Calculated floor rise index out of bounds');
    });

    const req = new Request('http://localhost:3000/api/test');
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Calculated floor rise index out of bounds');
  });
});
