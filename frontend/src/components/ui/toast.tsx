import { cn } from "../../lib/utils";

type ToastProps = {
  open: boolean;
  message: string;
  variant?: "success" | "warning" | "default";
  onClose: () => void;
};

const variantStyles: Record<NonNullable<ToastProps["variant"]>, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  default: "border-slate-200 bg-white text-slate-900",
};

export function Toast({ open, message, variant = "default", onClose }: ToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={cn("fixed right-5 bottom-5 z-50 w-full max-w-sm rounded-2xl border px-4 py-3 shadow-xl shadow-slate-900/10", variantStyles[variant])} role="status" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-6">{message}</p>
        <button type="button" onClick={onClose} className="text-slate-500 transition hover:text-slate-700">
          ×
        </button>
      </div>
    </div>
  );
}
