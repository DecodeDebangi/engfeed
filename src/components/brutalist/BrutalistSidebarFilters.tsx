'use client';

import React, { useState } from 'react';
import { Filter, RotateCcw, Search, ChevronDown, Building2, Tag } from 'lucide-react';
import { CompanyOption } from '../SidebarFilters';

interface BrutalistSidebarFiltersProps {
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
  { name: 'AI & ML', bg: 'bg-yellow-300 text-black' },
  { name: 'Infrastructure', bg: 'bg-cyan-300 text-black' },
  { name: 'Distributed Systems', bg: 'bg-indigo-300 text-black' },
  { name: 'Databases', bg: 'bg-lime-300 text-black' },
  { name: 'Backend', bg: 'bg-violet-300 text-black' },
  { name: 'Frontend', bg: 'bg-pink-300 text-black' },
  { name: 'Security', bg: 'bg-rose-300 text-black' },
  { name: 'DevOps', bg: 'bg-teal-300 text-black' },
  { name: 'Mobile', bg: 'bg-orange-300 text-black' },
  { name: 'Fintech', bg: 'bg-emerald-300 text-black' },
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

export const BrutalistSidebarFilters: React.FC<BrutalistSidebarFiltersProps> = ({
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
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6 font-mono">
      <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-black pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-black stroke-[3]" />
            <h2 className="text-sm font-black text-black uppercase tracking-tight">
              FILTER MATRIX
            </h2>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="text-xs font-bold bg-rose-400 text-black px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_#000] hover:bg-rose-300"
            >
              CLEAR ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Tech Topic Tags */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-black uppercase flex items-center justify-between">
            <span>TECH TOPICS</span>
            {selectedTag && <span className="text-[10px] bg-black text-white px-1">ACTIVE</span>}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TECH_TAGS.map((tagObj) => {
              const isSelected = selectedTag === tagObj.name;
              return (
                <button
                  key={tagObj.name}
                  onClick={() => setSelectedTag(isSelected ? null : tagObj.name)}
                  className={`px-2.5 py-1 text-xs font-black uppercase border-2 border-black transition-all ${
                    isSelected
                      ? 'bg-black text-yellow-300 shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                      : `${tagObj.bg} hover:shadow-[3px_3px_0px_0px_#000]`
                  }`}
                >
                  {tagObj.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-black uppercase">DOMAINS</h3>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className={`px-2 py-1 text-xs font-bold border-2 border-black transition-all ${
                    isSelected
                      ? 'bg-black text-white shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-slate-100 text-black hover:bg-white shadow-[2px_2px_0px_0px_#000]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company Blog Selector */}
        <div className="space-y-3 pt-3 border-t-3 border-black">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-black uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 stroke-[3]" />
              <span>BLOG SOURCES ({companies.length})</span>
            </h3>
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="text-black hover:bg-slate-100 p-0.5 border border-black"
            >
              <ChevronDown className={`w-4 h-4 stroke-[3] transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isCompanyDropdownOpen && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-black stroke-[3]" />
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="FILTER COMPANY..."
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-yellow-100 shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              <div className="max-h-56 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {selectedCompanySlug && (
                  <button
                    onClick={() => setSelectedCompanySlug(null)}
                    className="w-full text-left px-2 py-1 bg-black text-yellow-300 text-xs font-black border border-black flex items-center justify-between"
                  >
                    <span>SELECTED: {selectedCompanyObj?.name || selectedCompanySlug}</span>
                    <span className="underline text-[10px]">CLEAR</span>
                  </button>
                )}

                {filteredCompanies.map((company) => {
                  const isSelected = selectedCompanySlug === company.slug;
                  return (
                    <button
                      key={company.id}
                      onClick={() => setSelectedCompanySlug(isSelected ? null : company.slug)}
                      className={`w-full text-left px-2 py-1 text-xs font-bold border border-black transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-yellow-300 text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-white text-black hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate max-w-[170px]">{company.name}</span>
                      <span className="text-[10px] bg-black text-white px-1.5 font-mono">
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
