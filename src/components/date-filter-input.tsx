"use client";

import { type ChangeEvent, useRef } from "react";

type DateFilterInputProps = {
  name?: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export default function DateFilterInput({
  name,
  label,
  defaultValue = "",
  value,
  onChange,
}: DateFilterInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isControlled = typeof value === "string";

  return (
    <label className="text-xs text-slate-300">
      {label}
      <div className="relative mt-1">
        <input
          ref={inputRef}
          name={name}
          type="date"
          {...(isControlled
            ? {
                value,
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  onChange?.(event.target.value),
              }
            : { defaultValue })}
          className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 pr-10 text-xs text-slate-100 outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={() => {
            if (inputRef.current?.showPicker) {
              inputRef.current.showPicker();
            } else {
              inputRef.current?.focus();
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-800 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          aria-label="Open calendar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>
    </label>
  );
}
