
"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon, FileDown } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


interface ReportControlsProps {
    data: any[]; // The data to be exported
    className?: string;
}

export function ReportControls({ data, className }: ReportControlsProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2024, 0, 1),
    to: addDays(new Date(2024, 0, 1), 365),
  })

  // Export functionality is temporarily disabled to resolve build issues.
  const handleDownloadExcel = () => {
    alert("Fitur ekspor Excel sedang dalam perbaikan.");
  };

  const handleDownloadPdf = () => {
     alert("Fitur ekspor PDF sedang dalam perbaikan.");
  };


  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full sm:w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y", { locale: id })} -{" "}
                    {format(date.to, "LLL dd, y", { locale: id })}
                  </>
                ) : (
                  format(date.from, "LLL dd, y", { locale: id })
                )
              ) : (
                <span>Pilih tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={id}
            />
            <div className="p-2 border-t">
                <Select onValueChange={(value) => {
                    const now = new Date();
                    if (value === "this-month") {
                        setDate({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) });
                    } else if (value === "last-month") {
                        setDate({ from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) });
                    } else if (value === 'last-3-months') {
                         setDate({ from: new Date(now.getFullYear(), now.getMonth() - 3, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) });
                    }
                }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih preset" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        <SelectItem value="this-month">Bulan Ini</SelectItem>
                        <SelectItem value="last-month">Bulan Lalu</SelectItem>
                        <SelectItem value="last-3-months">3 Bulan Terakhir</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </PopoverContent>
        </Popover>
        <Button onClick={handleDownloadPdf} variant="outline" disabled>
            <FileDown className="mr-2 h-4 w-4" /> PDF
        </Button>
        <Button onClick={handleDownloadExcel} variant="outline" disabled>
            <FileDown className="mr-2 h-4 w-4" /> Excel
        </Button>
    </div>
  )
}
