import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Firm Calendar & Lead Reminders | ZamZam CRM',
  description: 'Unified brokerage calendar, scheduled follow-ups, and site visit tours for ZamZam Properties',
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="calendar-page-container">{children}</div>;
}
