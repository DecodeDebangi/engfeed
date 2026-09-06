import { MaterialEngFeedDashboard } from '@/components/material/MaterialEngFeedDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EngFeed [Material You UI] - Real-Time Engineering Blog Aggregator',
  description:
    'Material Design 3 edition of EngFeed engineering blog aggregator and reader dashboard.',
};

export default function HomePage() {
  return <MaterialEngFeedDashboard />;
}
