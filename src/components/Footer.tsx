import React from 'react';
import { Phone, MapPin, Instagram } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Brand & Address */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <span className="font-serif font-bold text-amber-400 tracking-wider text-sm">
            SR FASHION
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="text-slate-300 font-medium italic">
            Sabki Pasand SR Fashion
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Eidgah Kaman Road, Near Dabak Pul, Degloor Naka, Nanded</span>
          </div>
        </div>

        {/* Contact & Social */}
        <div className="flex items-center gap-5 text-slate-300">
          <a
            href="tel:7588756669"
            className="flex items-center gap-1.5 hover:text-amber-400 transition"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold tracking-wide">7588756669</span>
          </a>
          <a
            href="https://instagram.com/srfashion_nanded"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-amber-400 transition"
          >
            <Instagram className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">@srfashion_nanded</span>
          </a>
        </div>

      </div>
    </footer>
  );
};
