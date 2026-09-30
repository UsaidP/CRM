import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Firm Calendar & Lead Reminders',
  description: 'Unified brokerage calendar, scheduled follow-ups, and site visit tours for your brokerage',
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="calendar-page-container">{children}</div>;
}
