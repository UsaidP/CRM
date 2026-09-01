import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { parseInventoryContent } from '@/lib/inventory-media';
import { ClientPortalView } from '@/components/portal/ClientPortalView';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams?.token;
    if (!token) return { title: 'Portal Not Found | ZamZam Properties' };

    const portal = await prisma.clientPortal.findUnique({
      where: { token },
      select: { title: true, customMessage: true },
    });

    if (!portal) {
      return {
        title: 'Portal Not Found | ZamZam Properties',
      };
    }

    return {
      title: `${portal.title} | ZamZam Properties Advisory`,
      description: portal.customMessage || 'Curated verified Navi Mumbai property portfolio.',
    };
  } catch {
    return {
      title: 'Client Property Portal | ZamZam Properties',
    };
  }
}

export default async function ClientPortalPage({ params }: PageProps) {
  const { token } = await params;
  
  if (!token) {
    notFound();
  }

  const portal = await prisma.clientPortal.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
          reraBrokerRegistration: true,
        },
      },
      lead: {
        select: {
          id: true,
          fullName: true,
          phoneE164: true,
          assignedBroker: {
            select: {
              fullName: true,
              phoneE164: true,
              email: true,
              role: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          fullName: true,
          phoneE164: true,
          email: true,
          role: true,
        },
      },
      portalUnits: {
        orderBy: { displayOrder: 'asc' },
        include: {
          propertyUnit: {
            include: {
              project: true,
            },
          },
        },
      },
    },
  });

  if (!portal || !portal.isActive) {
    notFound();
  }

  // Format units with rich media
  const formattedUnits = portal.portalUnits.map((pu) => {
    const project = parseInventoryContent(pu.propertyUnit.project);
    const propertyUnit = parseInventoryContent(pu.propertyUnit);
    return {
      ...pu,
      propertyUnit: {
        ...propertyUnit,
        project,
        amenities: project.amenities,
        photoGallery: propertyUnit.mediaGallery.filter((asset) => asset.kind === 'image').map((asset) => asset.url),
      },
    };
  });

  const hydratedPortal = {
    ...portal,
    portalUnits: formattedUnits,
  };

  return <ClientPortalView portal={hydratedPortal} token={token} />;
}
