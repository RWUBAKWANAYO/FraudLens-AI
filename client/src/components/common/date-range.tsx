"use client";

import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { MoveRight, CalendarIcon } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

interface DateRangePickerProps {
  title?: string;
  startDate?: Date;
  endDate?: Date;
  onChange?: (range: { startDate?: Date; endDate?: Date }) => void;
}

export function DateRangePicker({
  title = "Select range",
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  const [start, setStart] = useState<Date | null>(startDate ?? null);
  const [end, setEnd] = useState<Date | null>(endDate ?? null);

  useEffect(() => {
    onChange?.({ startDate: start ?? undefined, endDate: end ?? undefined });
  }, [start, end]);

  return (
    <div className="w-full xl:w-fit flex flex-col gap-3">
      {title && <label className="text-sm font-medium px-1">{title}</label>}
      <div className="w-full flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <DatePicker
            selected={start}
            onChange={(date) => {
              setStart(date);
              if (end && date && end < date) setEnd(null);
            }}
            placeholderText="Start date"
            className="custom-input pl-10"
            calendarClassName="custom-calendar"
            popperClassName="custom-popper"
            dateFormat="MMM dd, yyyy"
            popperPlacement="bottom-start"
          />
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
        </div>

        <MoveRight className="size-4 text-primary transform rotate-90 sm:rotate-0" />

        <div className="relative flex-1 w-full sm:w-auto">
          <DatePicker
            selected={end}
            onChange={(date) => setEnd(date)}
            placeholderText="End date"
            className="custom-input pl-10"
            calendarClassName="custom-calendar"
            popperClassName="custom-popper"
            dateFormat="MMM dd, yyyy"
            popperPlacement="bottom-end"
            minDate={start || undefined}
          />
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
