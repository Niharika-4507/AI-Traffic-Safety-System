import React from 'react';

export default function LoadingSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="h-12 bg-[#232830] border border-[#3E4651] animate-pulse flex items-center px-4"
        >
          <div className="w-1/4 h-3 bg-[#3E4651] mr-4" />
          <div className="w-1/3 h-3 bg-[#3E4651]/60 mr-4" />
          <div className="w-1/6 h-3 bg-[#3E4651]/40 ml-auto" />
        </div>
      ))}
    </div>
  );
}
