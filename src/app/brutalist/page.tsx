import { BrutalistEngFeedDashboard } from '@/components/brutalist/BrutalistEngFeedDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EngFeed [Brutalist UI] - High-Contrast Neo-Brutalist Reader',
  description: 'Neo-Brutalist edition of EngFeed engineering blog aggregator.',
};

export default function BrutalistPage() {
  return <BrutalistEngFeedDashboard />;
}
