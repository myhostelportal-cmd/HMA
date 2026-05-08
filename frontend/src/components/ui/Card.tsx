import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'flat' | 'gradient';
  title?: string;
  subtitle?: string;
}

const Card = ({ children, className, variant = 'default', title, subtitle }: CardProps) => {
  return (
    <div className={cn(
      "rounded-2xl p-6 transition-all duration-300",
      variant === 'default' && "bg-white border border-slate-200 shadow-sm hover:shadow-md",
      variant === 'flat' && "bg-slate-50 border-none",
      variant === 'gradient' && "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg",
      className
    )}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className={cn("font-bold text-lg", variant === 'gradient' ? "text-white" : "text-slate-800")}>{title}</h3>}
          {subtitle && <p className={cn("text-sm", variant === 'gradient' ? "text-blue-100" : "text-slate-500")}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
