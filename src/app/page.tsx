import { EditorialEngFeedDashboard } from '@/components/editorial/EditorialEngFeedDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EngFeed - Engineering posts from top company blogs',
  description:
    'Engineering posts from 80 company engineering blogs, with announcements, hiring and marketing posts filtered out.',
};

export default function HomePage() {
  return <EditorialEngFeedDashboard />;
}
