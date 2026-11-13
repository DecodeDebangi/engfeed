'use client';

import React, { useState } from 'react';

interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
}

// A blog's icon, or its initial when there's no icon or the site refuses to serve it
// (some, like openai.com, block requests from other sites with a 403)
export const CompanyLogo: React.FC<CompanyLogoProps> = ({ name, logoUrl }) => {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className="w-7 h-7 rounded-lg object-cover bg-stone-100 border border-stone-200/80 flex-shrink-0"
      />
    );
  }

  return (
    <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
      {name.charAt(0)}
    </div>
  );
};
