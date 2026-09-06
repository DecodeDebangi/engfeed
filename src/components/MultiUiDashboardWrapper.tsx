'use client';

import React, { useState, useEffect } from 'react';
import { EditorialEngFeedDashboard } from '@/components/editorial/EditorialEngFeedDashboard';
import { EngFeedDashboard } from '@/components/EngFeedDashboard';
import { MaterialEngFeedDashboard } from '@/components/material/MaterialEngFeedDashboard';
import { BrutalistEngFeedDashboard } from '@/components/brutalist/BrutalistEngFeedDashboard';
import { FloatingUiSwitcher, UiStyleMode } from '@/components/FloatingUiSwitcher';

export const MultiUiDashboardWrapper: React.FC = () => {
  const [currentStyle, setCurrentStyle] = useState<UiStyleMode>('editorial');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('engfeed_ui_mode') as UiStyleMode;
    if (saved && ['editorial', 'glass', 'material', 'brutalist'].includes(saved)) {
      setCurrentStyle(saved);
    }
  }, []);

  const handleStyleChange = (mode: UiStyleMode) => {
    setCurrentStyle(mode);
    localStorage.setItem('engfeed_ui_mode', mode);
  };

  return (
    <div className="relative min-h-screen">
      {currentStyle === 'editorial' && <EditorialEngFeedDashboard />}
      {currentStyle === 'glass' && <EngFeedDashboard />}
      {currentStyle === 'material' && <MaterialEngFeedDashboard />}
      {currentStyle === 'brutalist' && <BrutalistEngFeedDashboard />}

      <FloatingUiSwitcher
        currentStyle={currentStyle}
        onStyleChange={handleStyleChange}
      />
    </div>
  );
};
