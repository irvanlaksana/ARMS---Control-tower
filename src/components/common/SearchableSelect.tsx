import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Pilih salah satu...', 
  disabled,
  searchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (disabled) return;
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setIsOpen(true);
  };

  const closeMenu = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setIsOpen(false), 200);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.relatedTarget || !wrapperRef.current?.contains(event.relatedTarget as Node)) {
      closeMenu();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div 
      className="relative w-full group" 
      ref={wrapperRef}
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
      onFocus={openMenu}
      onBlur={handleBlur}
    >
      <div 
        className={`w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between cursor-pointer transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500/50 hover:bg-slate-800/80'}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => !disabled && setIsOpen(true)}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
      >
        <span className={`truncate mr-2 ${selectedOption ? 'text-slate-100 font-medium' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-400' : 'group-hover:text-indigo-400'}`} />
      </div>

      {/* Dropdown Menu */}
      <div 
        className={`absolute z-[100] top-full mt-1.5 left-0 w-full min-w-[220px] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 origin-top ${isOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'}`}
      >
        {searchable && (
          <div className="p-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
            <Search className="w-4 h-4 text-slate-500 ml-1" />
            <input 
              autoFocus={isOpen}
              type="text" 
              className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-slate-500 py-1" 
              placeholder="Ketik untuk mencari..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
        <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 text-center flex flex-col items-center">
              <span className="block mb-1">Tidak ada hasil pencarian</span>
            </div>
          ) : (
            filteredOptions.map(option => (
              <div 
                key={option.value}
                className={`px-3 py-2.5 my-0.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors duration-200 ${String(option.value) === String(value) ? 'bg-indigo-600/10 text-indigo-400 font-medium' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(option.value);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span>{option.label}</span>
                  {option.subLabel && <span className="text-[10px] text-slate-500">{option.subLabel}</span>}
                </div>
                {String(option.value) === String(value) && <Check className="w-4 h-4 text-indigo-500" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
