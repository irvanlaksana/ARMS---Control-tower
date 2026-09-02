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
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      className="relative w-full" 
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className={`w-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-2.5 text-xs flex items-center justify-between cursor-pointer transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500/50 hover:bg-slate-800/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-white' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      <div 
        className={`absolute z-[100] top-full mt-1 left-0 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'}`}
      >
        {searchable && (
          <div className="p-2.5 border-b border-slate-800/50 flex items-center gap-2 bg-slate-950/50">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              autoFocus={isOpen}
              type="text" 
              className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-slate-500" 
              placeholder="Cari..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">Tidak ditemukan</div>
          ) : (
            filteredOptions.map(option => (
              <div 
                key={option.value}
                className={`px-3 py-2.5 my-0.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors duration-300 ${String(option.value) === String(value) ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.value);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  {option.subLabel && <span className="text-[10px] text-slate-400">{option.subLabel}</span>}
                </div>
                {String(option.value) === String(value) && <Check className="w-4 h-4" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
