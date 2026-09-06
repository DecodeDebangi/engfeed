'use client';

import React, { useState } from 'react';
import { Filter, RotateCcw, Search, ChevronDown, Building2, Tag, Sparkles } from 'lucide-react';
import { CompanyOption } from '../SidebarFilters';

interface MaterialSidebarFiltersProps {
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

export const MaterialSidebarFilters: React.FC<MaterialSidebarFiltersProps> = ({
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Filter Feed
            </h2>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-full transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Material Tech Chips */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Tech Topics</span>
            {selectedTag && <span className="text-[10px] text-indigo-600 font-semibold">1 Active</span>}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TECH_TAGS.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Material Categories */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Domain Categories
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company Blog Selector */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Engineering Blogs ({companies.length})</span>
            </h3>
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="text-slate-400 hover:text-slate-600"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isCompanyDropdownOpen && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Filter company..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="max-h-56 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {selectedCompanySlug && (
                  <button
                    onClick={() => setSelectedCompanySlug(null)}
                    className="w-full text-left px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 flex items-center justify-between"
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
                      className={`w-full text-left px-3 py-1.5 rounded-2xl text-xs font-medium transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate max-w-[170px]">{company.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
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
