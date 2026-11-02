'use client';

import React, { useState, useEffect } from 'react';
import { EditorialEngFeedDashboard } from '@/components/editorial/EditorialEngFeedDashboard';
import { EngFeedDashboard } from '@/components/EngFeedDashboard';
import { MaterialEngFeedDashboard } from '@/components/material/MaterialEngFeedDashboard';
import { BrutalistEngFeedDashboard } from '@/components/brutalist/BrutalistEngFeedDashboard';
import { FloatingUiSwitcher, UiStyleMode } from '@/components/FloatingUiSwitcher';
import { KindFilterToggle } from '@/components/KindFilterToggle';

export const MultiUiDashboardWrapper: React.FC = () => {
  const [currentStyle, setCurrentStyle] = useState<UiStyleMode>('editorial');
  const [mounted, setMounted] = useState(false);
  const [showAllKinds, setShowAllKinds] = useState(false);
  const [hasClassifiedArticles, setHasClassifiedArticles] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('engfeed_ui_mode') as UiStyleMode;
    if (saved && ['editorial', 'glass', 'material', 'brutalist'].includes(saved)) {
      setCurrentStyle(saved);
    }
    setShowAllKinds(localStorage.getItem('engfeed_show_all_kinds') === 'true');

    // Without an LLM nothing gets classified, so there's nothing for the toggle to filter
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => setHasClassifiedArticles(data.stats?.classifiedArticles > 0))
      .catch(() => setHasClassifiedArticles(false));
  }, []);

  const handleStyleChange = (mode: UiStyleMode) => {
    setCurrentStyle(mode);
    localStorage.setItem('engfeed_ui_mode', mode);
  };

  const handleShowAllKindsChange = (showAll: boolean) => {
    setShowAllKinds(showAll);
    localStorage.setItem('engfeed_show_all_kinds', String(showAll));
  };

  return (
    <div className="relative min-h-screen">
      {currentStyle === 'editorial' && <EditorialEngFeedDashboard showAllKinds={showAllKinds} />}
      {currentStyle === 'glass' && <EngFeedDashboard showAllKinds={showAllKinds} />}
      {currentStyle === 'material' && <MaterialEngFeedDashboard showAllKinds={showAllKinds} />}
      {currentStyle === 'brutalist' && <BrutalistEngFeedDashboard showAllKinds={showAllKinds} />}

      {hasClassifiedArticles && <KindFilterToggle showAll={showAllKinds} onChange={handleShowAllKindsChange} />}

      <FloatingUiSwitcher
        currentStyle={currentStyle}
        onStyleChange={handleStyleChange}
      />
    </div>
  );
};
