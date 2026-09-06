'use client';

import React, { useState } from 'react';
import { Filter, RotateCcw, Search, ChevronDown, Building2, BookMarked } from 'lucide-react';
import { CompanyOption } from '../SidebarFilters';

interface EditorialSidebarFiltersProps {
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedCompanySlug: string | null;
  setSelectedCompanySlug: (slug: string | null) => void;
  companies: CompanyOption[];
  onResetFilters: () => void;
  themeMode: 'paper' | 'night';
}

const TECH_TAGS = [
  'AI & ML',
  'Infrastructure',
  'Distributed Systems',
  'Databases',
  'Backend',
  'Frontend',
  'Security',
  'DevOps',
  'Mobile',
  'Fintech',
];

const CATEGORIES = [
  'Big Tech',
  'Cloud & Infra',
  'AI & ML',
  'DevTools',
  'Fintech',
  'Data Engineering',
  'Frontend',
  'Security',
];

export const EditorialSidebarFilters: React.FC<EditorialSidebarFiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedTag,
  setSelectedTag,
  selectedCompanySlug,
  setSelectedCompanySlug,
  companies,
  onResetFilters,
  themeMode,
}) => {
  const [companySearch, setCompanySearch] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(true);

  const isNight = themeMode === 'night';

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.category.toLowerCase().includes(companySearch.toLowerCase())
  );

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) + (selectedTag ? 1 : 0) + (selectedCompanySlug ? 1 : 0);

  const selectedCompanyObj = companies.find((c) => c.slug === selectedCompanySlug);

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6 font-sans">
      <div
        className={`rounded-2xl border p-5 space-y-6 transition-colors ${
          isNight
            ? 'bg-[#18191c] border-stone-800 text-stone-200'
            : 'bg-white border-stone-200 text-slate-900 shadow-sm'
        }`}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${isNight ? 'border-stone-800' : 'border-stone-200'}`}>
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${isNight ? 'text-amber-400' : 'text-amber-900'}`} />
            <h2 className={`text-xs font-serif font-bold uppercase tracking-wider ${isNight ? 'text-stone-200' : 'text-slate-950 font-bold'}`}>
              Editorial Topics
            </h2>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className={`text-xs font-bold hover:underline flex items-center gap-1 ${
                isNight ? 'text-amber-400' : 'text-amber-900'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Tech Topic Chips */}
        <div className="space-y-3">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between ${isNight ? 'text-stone-400' : 'text-slate-800 font-bold'}`}>
            <span>Engineering Topics</span>
            {selectedTag && <span className="text-[10px] text-amber-700 font-semibold">1 Selected</span>}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TECH_TAGS.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl border transition-all ${
                    isSelected
                      ? isNight
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                        : 'bg-amber-950 text-white border-amber-950 font-bold'
                      : isNight
                      ? 'bg-[#222428] border-stone-800 text-stone-300 hover:border-stone-700'
                      : 'bg-stone-100 border-stone-300 text-slate-800 hover:bg-stone-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Domain Categories */}
        <div className="space-y-3">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isNight ? 'text-stone-400' : 'text-slate-800 font-bold'}`}>
            Categories
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl border transition-all ${
                    isSelected
                      ? isNight
                        ? 'bg-stone-100 text-stone-900 border-stone-100 font-bold'
                        : 'bg-slate-950 text-white border-slate-950 font-bold'
                      : isNight
                      ? 'bg-[#222428] border-stone-800 text-stone-300 hover:border-stone-700'
                      : 'bg-stone-100 border-stone-300 text-slate-800 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company Blog Selector */}
        <div className={`space-y-3 pt-3 border-t ${isNight ? 'border-stone-800' : 'border-stone-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isNight ? 'text-stone-400' : 'text-slate-800 font-bold'}`}>
              <Building2 className={`w-3.5 h-3.5 ${isNight ? 'text-amber-400' : 'text-amber-900'}`} />
              <span>Blog Sources ({companies.length})</span>
            </h3>
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className={isNight ? 'text-stone-400 hover:text-stone-200' : 'text-slate-600 hover:text-slate-900'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isCompanyDropdownOpen && (
            <div className="space-y-2">
              <div className="relative">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isNight ? 'text-stone-500' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Filter blog source..."
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium focus:outline-none border ${
                    isNight
                      ? 'bg-[#222428] border-stone-800 text-stone-100 placeholder-stone-500'
                      : 'bg-stone-100 border-stone-300 text-slate-900 placeholder-slate-500 focus:border-slate-500'
                  }`}
                />
              </div>

              <div className="max-h-56 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {selectedCompanySlug && (
                  <button
                    onClick={() => setSelectedCompanySlug(null)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-between ${
                      isNight
                        ? 'bg-amber-900/30 text-amber-300 border-amber-500/30'
                        : 'bg-amber-100 text-amber-950 border-amber-300'
                    }`}
                  >
                    <span>Selected: {selectedCompanyObj?.name || selectedCompanySlug}</span>
                    <span className="text-[10px] underline">Remove</span>
                  </button>
                )}

                {filteredCompanies.map((company) => {
                  const isSelected = selectedCompanySlug === company.slug;
                  return (
                    <button
                      key={company.id}
                      onClick={() => setSelectedCompanySlug(isSelected ? null : company.slug)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                        isSelected
                          ? isNight
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-amber-950 text-white font-bold'
                          : isNight
                          ? 'text-stone-300 hover:bg-stone-800'
                          : 'text-slate-800 hover:bg-stone-100 font-semibold'
                      }`}
                    >
                      <span className="truncate max-w-[170px]">{company.name}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {company.articlesCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};
