'use client';

import React, { useState } from 'react';
import { Filter, Cpu, Tag, Building2, RotateCcw, Search, Check, ChevronDown, Sparkles } from 'lucide-react';

export interface CompanyOption {
  id: string;
  name: string;
  slug: string;
  category: string;
  articlesCount: number;
}

interface SidebarFiltersProps {
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedCompanySlug: string | null;
  setSelectedCompanySlug: (slug: string | null) => void;
  companies: CompanyOption[];
  onResetFilters: () => void;
}

const TECH_TAGS = [
  { name: 'AI & ML', icon: Sparkles, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
  { name: 'Infrastructure', icon: Cpu, color: 'text-sky-400 border-sky-500/20 bg-sky-500/10' },
  { name: 'Distributed Systems', icon: Tag, color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10' },
  { name: 'Databases', icon: Tag, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
  { name: 'Backend', icon: Tag, color: 'text-violet-400 border-violet-500/20 bg-violet-500/10' },
  { name: 'Frontend', icon: Tag, color: 'text-pink-400 border-pink-500/20 bg-pink-500/10' },
  { name: 'Security', icon: Tag, color: 'text-rose-400 border-rose-500/20 bg-rose-500/10' },
  { name: 'DevOps', icon: Tag, color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' },
  { name: 'Mobile', icon: Tag, color: 'text-teal-400 border-teal-500/20 bg-teal-500/10' },
  { name: 'Fintech', icon: Tag, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
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

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedTag,
  setSelectedTag,
  selectedCompanySlug,
  setSelectedCompanySlug,
  companies,
  onResetFilters,
}) => {
  const [companySearch, setCompanySearch] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(true);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.category.toLowerCase().includes(companySearch.toLowerCase())
  );

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) + (selectedTag ? 1 : 0) + (selectedCompanySlug ? 1 : 0);

  const selectedCompanyObj = companies.find((c) => c.slug === selectedCompanySlug);

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6">
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Filter Feed
            </h2>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Tech Topic Tags */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Tech Topics</span>
            {selectedTag && (
              <span className="text-[10px] text-indigo-400 font-mono">1 selected</span>
            )}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TECH_TAGS.map((tagObj) => {
              const isSelected = selectedTag === tagObj.name;
              return (
                <button
                  key={tagObj.name}
                  onClick={() => setSelectedTag(isSelected ? null : tagObj.name)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{tagObj.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Domain Categories
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company Blog Selector */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Engineering Blogs ({companies.length})</span>
            </h3>
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="text-slate-400 hover:text-slate-200"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isCompanyDropdownOpen && (
            <div className="space-y-2">
              {/* Search company input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search company..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Company List Scroll Area */}
              <div className="max-h-56 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {selectedCompanySlug && (
                  <button
                    onClick={() => setSelectedCompanySlug(null)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 hover:bg-indigo-900/40 flex items-center justify-between"
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/90 text-white font-medium shadow'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span className="truncate max-w-[170px]">{company.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800/80 text-slate-400'
                      }`}>
                        {company.articlesCount}
                      </span>
                    </button>
                  );
                })}

                {filteredCompanies.length === 0 && (
                  <p className="text-xs text-slate-500 py-2 text-center">No company found.</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};
