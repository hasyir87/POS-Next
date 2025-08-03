"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon, Download, FileDown } from "lucide-react"
import { DateRange } from "react-day-picker"
import jsPDF from "jspdf"
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx';


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
import { saveAs } from "file-saver"


interface ReportControlsProps {
    data: any[]; // The data to be exported
    className?: string;
}

export function ReportControls({ data, className }: ReportControlsProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2024, 0, 1),
    to: addDays(new Date(2024, 0, 1), 365),
  })

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, "report.xlsx");
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    doc.text("Profit & Loss Report", 14, 16);
    autoTable(doc, {
        head: [['Period', 'Revenue', 'COGS', 'Profit']],
        body: data.map(row => [row.name, `$${row.revenue}`, `$${row.cogs}`, `$${row.profit}`]),
        startY: 20
    });
    doc.save('report.pdf');
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
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
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
                        <SelectValue placeholder="Select a preset" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </PopoverContent>
        </Popover>
        <Button onClick={handleDownloadPdf} variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> PDF
        </Button>
        <Button onClick={handleDownloadExcel} variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Excel
        </Button>
    </div>
  )
}
