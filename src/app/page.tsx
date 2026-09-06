import { EditorialEngFeedDashboard } from '@/components/editorial/EditorialEngFeedDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EngFeed Editorial - Minimalist Reader for Engineering Blogs',
  description:
    'Distraction-free, editorial minimalist reader dashboard for top engineering blogs.',
};

export default function HomePage() {
  return <EditorialEngFeedDashboard />;
}
