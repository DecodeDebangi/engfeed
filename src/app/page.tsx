import { MultiUiDashboardWrapper } from '@/components/MultiUiDashboardWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EngFeed - Multi-Style Engineering Blog Reader & Aggregator',
  description:
    'Real-time engineering feed with customizable UI styles: Editorial Minimalist, Glassmorphism Dark, Material Design 3, and Neo-Brutalist.',
};

export default function HomePage() {
  return <MultiUiDashboardWrapper />;
}
