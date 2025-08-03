
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Shift = {
    id: string;
    date: string;
    cashier: string;
    start: number;
    end: number | null;
    status: "Aktif" | "Ditutup";
};

const initialShiftHistory: Shift[] = [
    { id: "SFT001", date: "2023-10-26", cashier: "Alice", start: 150000, end: 1632500, status: "Ditutup" },
    { id: "SFT002", date: "2023-10-26", cashier: "Bob", start: 150000, end: 1450750, status: "Ditutup" },
    { id: "SFT003", date: "2023-10-27", cashier: "Alice", start: 150000, end: 1780000, status: "Ditutup" },
    { id: "SFT004", date: "2023-10-27", cashier: "Charlie", start: 150000, end: 980250, status: "Ditutup" },
    { id: "SFT005", date: "2023-10-28", cashier: "Bob", start: 150000, end: null, status: "Aktif" },
];

const formatCurrency = (amount: number | null) => {
    if (amount === null) return "---";
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};


export default function ShiftsPage() {
    const { toast } = useToast();
    const [shifts, setShifts] = useState<Shift[]>(initialShiftHistory);
    const [isStartShiftOpen, setStartShiftOpen] = useState(false);
    const [isEndShiftOpen, setEndShiftOpen] = useState(false);
    const [startingCash, setStartingCash] = useState(150000);
    const [endingCash, setEndingCash] = useState(0);

    const activeShift = shifts.find(s => s.status === "Aktif");
    const cashSales = activeShift ? endingCash - activeShift.start : 0;

    const handleStartShift = () => {
        if (activeShift) {
            toast({ variant: "destructive", title: "Error", description: "Sudah ada shift yang aktif." });
            return;
        }
        const newShift: Shift = {
            id: `SFT${(shifts.length + 1).toString().padStart(3, '0')}`,
            date: new Date().toISOString().substring(0, 10),
            cashier: "Admin", // In a real app, this would be the logged in user
            start: startingCash,
            end: null,
            status: "Aktif",
        };
        setShifts(prev => [newShift, ...prev]);
        toast({ title: "Sukses", description: "Shift baru berhasil dimulai." });
        setStartShiftOpen(false);
    };
    
    const handleEndShift = () => {
        if (!activeShift) {
            toast({ variant: "destructive", title: "Error", description: "Tidak ada shift yang aktif untuk diakhiri." });
            return;
        }
        if (endingCash < activeShift.start) {
            toast({ variant: "destructive", title: "Error", description: "Kas akhir tidak boleh kurang dari kas awal." });
            return;
        }
        setShifts(shifts.map(s => s.id === activeShift.id ? { ...s, end: endingCash, status: "Ditutup" } : s));
        toast({ title: "Sukses", description: "Shift berhasil diakhiri." });
        setEndShiftOpen(false);
        setEndingCash(0);
    };


    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Manajemen Shift</h1>
                <div className="flex gap-2">
                    <Dialog open={isEndShiftOpen} onOpenChange={setEndShiftOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" disabled={!activeShift}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Akhiri Shift
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="font-headline">Akhiri Shift</DialogTitle>
                                <DialogDescription>
                                    Hitung uang tunai di laci dan masukkan jumlah akhir untuk menutup shift.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="ending-cash" className="text-right">Kas Akhir</Label>
                                    <Input id="ending-cash" type="number" value={endingCash} onChange={(e) => setEndingCash(parseFloat(e.target.value) || 0)} className="col-span-3" />
                                </div>
                                {activeShift && <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Ringkasan Shift</CardDescription>
                                        <CardTitle className="text-2xl">{formatCurrency(endingCash)}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground">
                                            {cashSales >= 0 ? `+ ${formatCurrency(cashSales)} dari penjualan tunai` : `- ${formatCurrency(Math.abs(cashSales))} selisih`}
                                        </div>
                                    </CardContent>
                                </Card>}
                            </div>
                            <DialogFooter>
                                <Button onClick={handleEndShift} type="submit">Konfirmasi & Akhiri Shift</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isStartShiftOpen} onOpenChange={setStartShiftOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={!!activeShift}>
                                <PlayCircle className="mr-2 h-4 w-4" /> Mulai Shift
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="font-headline">Mulai Shift Baru</DialogTitle>
                                <DialogDescription>
                                    Masukkan saldo kas awal untuk shift baru ini.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="starting-cash" className="text-right">Kas Awal</Label>
                                    <Input id="starting-cash" type="number" value={startingCash} onChange={(e) => setStartingCash(parseFloat(e.target.value) || 0)} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleStartShift} type="submit">Mulai Shift</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Shift</CardTitle>
                    <CardDescription>Catatan semua shift yang sudah lewat dan yang sedang berjalan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Kasir</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Saldo Awal</TableHead>
                                <TableHead className="text-right">Saldo Akhir</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shifts.map((shift) => (
                                <TableRow key={shift.id}>
                                    <TableCell>
                                        <div className="font-medium">{shift.date}</div>
                                        <div className="text-sm text-muted-foreground">{shift.id}</div>
                                    </TableCell>
                                    <TableCell>{shift.cashier}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 text-xs rounded-full ${shift.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-secondary'}`}>
                                            {shift.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(shift.start)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(shift.end)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

    