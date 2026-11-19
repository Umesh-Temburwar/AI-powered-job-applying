import React, { useState, useMemo } from 'react';
import {
  Search,
  Check,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  ROLE_CATEGORIES,
  ALL_SUGGESTED_ROLES,
} from '../../constants/roleCategories';

export interface RoleCategorySelectorProps {
  selectedRoles: string[];
  onAddRole: (role: string) => void;
  onRemoveRole?: (role: string) => void;
  onAddMultipleRoles?: (roles: string[]) => void;
  compact?: boolean;
  className?: string;
}

export const RoleCategorySelector: React.FC<RoleCategorySelectorProps> = ({
  selectedRoles,
  onAddRole,
  onRemoveRole,
  onAddMultipleRoles,
  compact = false,
  className = '',
}) => {
  const { theme } = useTheme();
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected set for O(1) membership check
  const selectedSet = useMemo(
    () => new Set(selectedRoles.map((r) => r.trim().toLowerCase())),
    [selectedRoles]
  );

  // Filter roles based on active category and search query
  const displayedRoles = useMemo(() => {
    let baseList: string[] = [];
    if (activeCategoryId === 'all') {
      baseList = ALL_SUGGESTED_ROLES;
    } else {
      const cat = ROLE_CATEGORIES.find((c) => c.id === activeCategoryId);
      baseList = cat ? cat.roles : [];
    }

    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.trim().toLowerCase();
    return baseList.filter((r) => r.toLowerCase().includes(q));
  }, [activeCategoryId, searchQuery]);

  // Count how many roles in each category are currently selected
  const categorySelectedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ROLE_CATEGORIES) {
      counts[cat.id] = cat.roles.filter((r) =>
        selectedSet.has(r.toLowerCase())
      ).length;
    }
    return counts;
  }, [selectedSet]);

  const activeCategory = useMemo(
    () => ROLE_CATEGORIES.find((c) => c.id === activeCategoryId),
    [activeCategoryId]
  );

  const handleToggleRole = (role: string) => {
    const isSelected = selectedSet.has(role.toLowerCase());
    if (isSelected && onRemoveRole) {
      onRemoveRole(role);
    } else if (!isSelected) {
      onAddRole(role);
    }
  };

  const handleAddAllInActiveCategory = () => {
    const rolesToAdd = displayedRoles.filter(
      (r) => !selectedSet.has(r.toLowerCase())
    );
    if (rolesToAdd.length === 0) return;

    if (onAddMultipleRoles) {
      onAddMultipleRoles(rolesToAdd);
    } else {
      rolesToAdd.forEach((r) => onAddRole(r));
    }
  };

  return (
    <div
      className={`border-2 ${
        theme === 'dark'
          ? 'border-[#2E384D] bg-[#111520]'
          : 'border-[#18181B] bg-white'
      } retro-shadow-sm ${compact ? 'p-2 space-y-2 text-xs' : 'p-3.5 space-y-3'} font-sans ${className}`}
    >
      {/* Header bar with icon and count */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-current/20 pb-2.5">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Layers className="w-4 h-4 shrink-0" />
          <span>Browse Job Role Categories ({ROLE_CATEGORIES.length} Domains)</span>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter roles (e.g. AI, React)..."
            className={`w-full pl-7 pr-2 py-1 text-[11px] font-mono border ${
              theme === 'dark'
                ? 'border-[#2E384D] bg-[#0B0E14] text-white placeholder-zinc-500'
                : 'border-zinc-300 bg-[#F5F3EC] text-black placeholder-zinc-400'
            } outline-none focus:border-emerald-500 transition-colors`}
          />
        </div>
      </div>

      {/* Category Pills/Tabs */}
      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveCategoryId('all')}
          className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase border transition-all cursor-pointer ${
            activeCategoryId === 'all'
              ? 'border-emerald-500 bg-emerald-500 text-black shadow-sm font-black'
              : theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-zinc-300 hover:border-zinc-500'
              : 'border-zinc-300 bg-zinc-100 text-zinc-700 hover:border-zinc-400'
          }`}
        >
          All Roles ({ALL_SUGGESTED_ROLES.length})
        </button>

        {ROLE_CATEGORIES.map((cat) => {
          const count = categorySelectedCounts[cat.id] || 0;
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-2 py-1 text-[11px] font-mono border flex items-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'border-emerald-500 bg-emerald-500 text-black font-bold'
                  : count > 0
                  ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400 font-semibold'
                  : theme === 'dark'
                  ? 'border-[#2E384D] bg-[#141A26] text-zinc-300 hover:border-zinc-500'
                  : 'border-zinc-300 bg-zinc-100 text-zinc-700 hover:border-zinc-400'
              }`}
            >
              <span>{cat.shortName}</span>
              {count > 0 && (
                <span className="px-1 py-0.2 text-[9px] rounded-full bg-emerald-600 text-white font-mono">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active category description & Add All Action */}
      {activeCategory && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 dark:text-zinc-400 px-1 pt-1">
          <span className="italic">{activeCategory.description}</span>
          <button
            type="button"
            onClick={handleAddAllInActiveCategory}
            className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500 hover:underline cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            + Add All in {activeCategory.shortName}
          </button>
        </div>
      )}

      {/* Roles Chips Grid */}
      <div
        className={`flex flex-wrap gap-1.5 p-2.5 border ${
          theme === 'dark'
            ? 'border-[#2E384D]/70 bg-[#0B0E14]'
            : 'border-zinc-200 bg-[#F9F8F5]'
        } max-h-56 overflow-y-auto`}
      >
        {displayedRoles.length === 0 ? (
          <div className="text-zinc-500 text-[11px] font-mono py-2 w-full text-center">
            No matching roles found for "{searchQuery}".
          </div>
        ) : (
          displayedRoles.map((role) => {
            const isSelected = selectedSet.has(role.toLowerCase());
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleToggleRole(role)}
                className={`px-2.5 py-1 text-[11px] font-mono border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30'
                    : theme === 'dark'
                    ? 'border-[#2E384D] bg-[#141A26] text-zinc-300 hover:border-emerald-500 hover:text-white'
                    : 'border-zinc-300 bg-white text-zinc-800 hover:border-emerald-600 hover:text-emerald-700'
                }`}
                title={isSelected ? `Click to remove "${role}"` : `Click to add "${role}"`}
              >
                {isSelected ? (
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <Plus className="w-3 h-3 text-zinc-400 shrink-0" />
                )}
                <span>{role}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
