import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Palmtree } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LeaveBalanceData } from '@/hooks/useLeaveBalance';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { CardError } from '@/components/common/CardError';

interface LeaveCarouselProps {
  data: LeaveBalanceData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

interface Stat {
  label: string;
  value: number | string;
}

interface Slide {
  title: string;
  stats: Stat[];
  action?: React.ReactNode;
}

const SLIDE_COUNT = 4;
const SLIDE_INTERVAL = 2500;

export function LeaveCarousel({ data, loading, error, onRetry }: LeaveCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDE_COUNT);
    }, SLIDE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const slides: Slide[] = data
    ? [
        {
          title: 'Sick Leave',
          stats: [
            { label: 'Entitled', value: data.sick.entitled },
            { label: 'Used', value: data.sick.used },
            { label: 'Balance', value: data.sick.balance },
          ],
        },
        {
          title: 'Earned Leave',
          stats: [
            { label: 'Accrued', value: data.earned.accrued },
            { label: 'Used', value: data.earned.used },
            { label: 'Balance', value: data.earned.balance },
          ],
        },
        {
          title: 'Casual Leave',
          stats: [
            { label: 'Entitled', value: data.casual.entitled },
            { label: 'Used', value: data.casual.used },
            { label: 'Balance', value: data.casual.balance },
          ],
        },
        {
          title: 'Leave Summary',
          stats: [
            {
              label: 'Total Available',
              value:
                data.sick.balance + data.earned.balance + data.casual.balance,
            },
            { label: 'Pending Requests', value: data.pendingRequests },
          ],
          action: (
            <button
              onClick={() => navigate('/employee/leave')}
              className="mt-4 flex items-center gap-3 text-[14px] font-extrabold text-blue-700"
            >
              Apply Leave <ArrowRight className="h-4 w-4" />
            </button>
          ),
        },
      ]
    : [];

  return (
    <section
      className="rounded-[8px] border border-[#dbe4f2] bg-white shadow-[0_10px_30px_rgba(15,35,80,0.04)] min-h-[150px] p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {loading ? (
        <CardSkeleton lines={3} />
      ) : error ? (
        <CardError onRetry={onRetry} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 overflow-hidden">
              <p className="text-[13px] font-bold text-[#14204a]">Leave Balance</p>

              <div className="relative overflow-hidden mt-2">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${current * 100}%)` }}
                >
                  {slides.map((slide, idx) => (
                    <div key={idx} className="min-w-full">
                      <p className="text-[13px] font-semibold text-[#4c577b]">{slide.title}</p>
                      <div className="mt-2 flex gap-4">
                        {slide.stats.map(stat => (
                          <div key={stat.label}>
                            <p className="text-[22px] font-extrabold leading-none tracking-[-0.03em] text-[#071334]">
                              {typeof stat.value === 'number' ? stat.value.toFixed(stat.value % 1 === 0 ? 0 : 1) : stat.value}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-[#4c577b]">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      {slide.action}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[10px] bg-orange-50 text-orange-500">
              <Palmtree className="h-8 w-8" />
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-1.5">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === current ? 'w-5 bg-orange-500' : 'w-1.5 bg-[#d9dee8]'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
