
"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon, FileDown } from "lucide-react"
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Laba Rugi");
    // Auto-size columns
    const max_width = data.reduce((w, r) => Math.max(w, r.Laporan.length), 10);
    worksheet["!cols"] = [ { wch: max_width }, { wch: 20 } ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, "laporan_laba_rugi.xlsx");
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const period = date?.from && date?.to ? `${format(date.from, "d LLL y")} - ${format(date.to, "d LLL y")}` : "Semua Waktu";
    
    doc.setFontSize(16);
    doc.text("Laporan Laba & Rugi", 14, 22);
    doc.setFontSize(10);
    doc.text(`Periode: ${period}`, 14, 28);
    
    autoTable(doc, {
        head: [['Laporan', 'Jumlah']],
        body: data.map(row => [row.Laporan, new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.Jumlah)]),
        startY: 35,
        theme: 'grid'
    });
    doc.save('laporan_laba_rugi.pdf');
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
        <Button onClick={handleDownloadPdf} variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> PDF
        </Button>
        <Button onClick={handleDownloadExcel} variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Excel
        </Button>
    </div>
  )
}
