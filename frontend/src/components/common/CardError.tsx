import { AlertCircle, RefreshCw } from 'lucide-react';

interface CardErrorProps {
  message?: string;
  onRetry: () => void;
}

export function CardError({ message = 'Failed to load data', onRetry }: CardErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
      <AlertCircle className="h-7 w-7 text-red-400" />
      <p className="text-[13px] font-medium text-[#4c577b]">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-[5px] border border-[#d7e1f0] bg-white px-3 py-1.5 text-[12px] font-bold text-[#061337] shadow-sm hover:bg-slate-50"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}
