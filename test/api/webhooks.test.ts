import { describe, it, expect, beforeAll } from 'bun:test';
import { GET as whatsappVerifyHandler, POST as whatsappPostHandler } from '@/app/api/v1/webhooks/whatsapp/route';
import { ensureTestOrganization } from '../helpers/test-db';

describe('API Integration: Webhooks Handlers (/api/v1/webhooks/*)', () => {
  beforeAll(async () => {
    await ensureTestOrganization();
  }, 30000);

  describe('WhatsApp Cloud API Webhook Handshake (GET)', () => {
    it('rejects verification handshake with invalid verify token', async () => {
      const req = new Request('http://localhost:3000/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=11223344');
      const res = await whatsappVerifyHandler(req);
      expect([403, 500]).toContain(res.status);
    });
  });

  describe('WhatsApp Webhook Payload Security (POST)', () => {
    it('rejects unsigned webhook payload when app secret is enforced', async () => {
      const req = new Request('http://localhost:3000/api/v1/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object: 'whatsapp_business_account', entry: [] }),
      });

      const res = await whatsappPostHandler(req);
      // Fails closed if missing signature header or invalid signature
      expect([401, 403, 500]).toContain(res.status);
    });
  });
});
