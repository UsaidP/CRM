'use client';

import { useEffect, useState } from 'react';
import { fetchSession } from '@/lib/client/auth';
import { resolveFirmName } from '@/lib/constants/brand';
import type { FirmIdentity } from '@/lib/export-utils';

/**
 * Read the current tenant's display name on the client.
 *
 * Returns the organisation name from the session, falling back to the product
 * name while the session is loading, when unauthenticated, or if the request
 * fails. The return value is therefore ALWAYS a usable, non-empty label — call
 * sites never need a `|| 'something'` of their own.
 *
 * CACHING
 * -------
 * The resolved name is cached at module scope, and concurrent callers share a
 * single in-flight request. This matters because the alternative — each page
 * calling `fetchSession()` itself — would issue one `/auth/session` request per
 * component that needs the name, on every mount. Several pages need it (exports,
 * letterheads, portal headers), so the duplicate traffic would be real.
 *
 * A module-level cache is the lightest option that avoids that. If the tenant
 * ever needs to change mid-session without a reload, promote this to a React
 * context inside AppShell (which already fetches the session) and have this hook
 * read from it.
 */
/**
 * Deployment-level contact details.
 *
 * The `Organization` model carries `name` and `reraBrokerRegistration`, so those
 * two come from the session. Phone and website are NOT modelled — they are
 * deployment configuration, so they come from env. That keeps a real firm's
 * contact details out of source code while still letting a deployment print its
 * own letterhead.
 *
 * Set these in `.env` (or the hosting provider) per deployment. Anything unset is
 * omitted from generated documents rather than replaced by another firm's value.
 */
const ENV_CONTACT = {
  phone: process.env.NEXT_PUBLIC_FIRM_PHONE || undefined,
  website: process.env.NEXT_PUBLIC_FIRM_WEBSITE || undefined,
} as const;

type SessionUser = {
  organization?: {
    name?: string | null;
    reraBrokerRegistration?: string | null;
  } | null;
};

let cachedIdentity: FirmIdentity | null = null;
let inflight: Promise<FirmIdentity | null> | null = null;

function loadIdentity(): Promise<FirmIdentity | null> {
  if (cachedIdentity !== null) return Promise.resolve(cachedIdentity);
  if (inflight) return inflight;

  inflight = fetchSession()
    .then((user) => {
      const org = (user as SessionUser | null)?.organization;
      const identity: FirmIdentity = {
        name: org?.name ?? undefined,
        reraNumber: org?.reraBrokerRegistration ?? undefined,
        phone: ENV_CONTACT.phone,
        website: ENV_CONTACT.website,
      };
      cachedIdentity = identity;
      return identity;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Clear the memoised identity. Exposed for tests and for logout flows. */
export function resetFirmIdentityCache(): void {
  cachedIdentity = null;
  inflight = null;
}

/** Full tenant identity: name, statutory registration and contact details. */
export function useFirmIdentity(): FirmIdentity {
  const [identity, setIdentity] = useState<FirmIdentity>(() =>
    cachedIdentity ?? { ...ENV_CONTACT }
  );

  useEffect(() => {
    let alive = true;
    loadIdentity().then((loaded) => {
      if (alive) setIdentity(loaded ?? { ...ENV_CONTACT });
    });
    return () => {
      alive = false;
    };
  }, []);

  return identity;
}

export function useFirmName(): string {
  const identity = useFirmIdentity();
  return resolveFirmName(identity.name);
}
