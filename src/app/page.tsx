import { BrutalistEngFeedDashboard } from '@/components/brutalist/BrutalistEngFeedDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EngFeed [Brutalist UI] - High-Contrast Neo-Brutalist Engineering Reader',
  description:
    'Neo-Brutalist edition of EngFeed engineering blog aggregator and reader dashboard.',
};

export default function HomePage() {
  return <BrutalistEngFeedDashboard />;
}
