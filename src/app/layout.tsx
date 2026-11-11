import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'EngFeed: engineering posts' }] },
  },
  title: 'EngFeed - Top Engineering Blogs Aggregator & Reader Dashboard',
  description:
    'EngFeed is a reader for top engineering blogs including Netflix, Meta, Cloudflare, Uber, Stripe, Airbnb, GitHub, OpenAI, and Vercel.',
  keywords: [
    'engineering blogs',
    'tech blogs',
    'software engineering',
    'system design',
    'distributed systems',
    'AI engineering',
    'backend architecture',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
