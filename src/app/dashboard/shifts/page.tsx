
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, PlayCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, query, where, getDocs, doc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';

type Shift = {
    id: string;
    organization_id: string;
    date: string;
    cashier_id: string;
    cashier_name: string;
    start_amount: number;
    end_amount: number | null;
    status: "Aktif" | "Ditutup";
};

const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "---";
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};


export default function ShiftsPage() {
    const { toast } = useToast();
    const { profile, selectedOrganizationId, loading: authLoading } = useAuth();
    const db = getFirestore(firebaseApp);

    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStartShiftOpen, setStartShiftOpen] = useState(false);
    const [isEndShiftOpen, setEndShiftOpen] = useState(false);
    const [startingCash, setStartingCash] = useState(150000);
    const [endingCash, setEndingCash] = useState(0);

    const activeShift = shifts.find(s => s.status === "Aktif");
    const cashSales = activeShift ? endingCash - activeShift.start_amount : 0;

    const fetchShifts = useCallback(async () => {
        if (!selectedOrganizationId) {
            setShifts([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const q = query(
                collection(db, "shifts"), 
                where("organization_id", "==", selectedOrganizationId),
                orderBy("created_at", "desc"),
                limit(50) // Ambil 50 shift terakhir
            );
            const querySnapshot = await getDocs(q);
            const shiftsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
            setShifts(shiftsData);
        } catch (error) {
            console.error("Error fetching shifts:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data shift." });
        } finally {
            setIsLoading(false);
        }
    }, [selectedOrganizationId, db, toast]);
    
    useEffect(() => {
        if (!authLoading && selectedOrganizationId) {
            fetchShifts();
        } else if (!authLoading && !selectedOrganizationId) {
            setIsLoading(false);
            setShifts([]);
        }
    }, [authLoading, selectedOrganizationId, fetchShifts]);

    const handleStartShift = async () => {
        if (activeShift) {
            toast({ variant: "destructive", title: "Error", description: "Sudah ada shift yang aktif." });
            return;
        }
        if (!profile || !selectedOrganizationId) {
            toast({ variant: "destructive", title: "Error", description: "Profil atau outlet tidak valid." });
            return;
        }

        const newShift = {
            organization_id: selectedOrganizationId,
            date: new Date().toISOString().substring(0, 10),
            cashier_id: profile.id,
            cashier_name: profile.full_name,
            start_amount: startingCash,
            end_amount: null,
            status: "Aktif" as const,
            created_at: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "shifts"), newShift);
            toast({ title: "Sukses", description: "Shift baru berhasil dimulai." });
            setStartShiftOpen(false);
            fetchShifts();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Memulai Shift", description: error.message });
        }
    };
    
    const handleEndShift = async () => {
        if (!activeShift) {
            toast({ variant: "destructive", title: "Error", description: "Tidak ada shift yang aktif untuk diakhiri." });
            return;
        }
        if (endingCash < activeShift.start_amount) {
            toast({ variant: "destructive", title: "Error", description: "Kas akhir tidak boleh kurang dari kas awal." });
            return;
        }

        const shiftRef = doc(db, "shifts", activeShift.id);
        try {
            await updateDoc(shiftRef, {
                end_amount: endingCash,
                status: "Ditutup",
                closed_at: serverTimestamp()
            });
            toast({ title: "Sukses", description: "Shift berhasil diakhiri." });
            setEndShiftOpen(false);
            setEndingCash(0);
            fetchShifts();
        } catch(error: any) {
            toast({ variant: "destructive", title: "Gagal Mengakhiri Shift", description: error.message });
        }
    };

    if (authLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Manajemen Shift</h1>
                <div className="flex gap-2">
                    <Dialog open={isEndShiftOpen} onOpenChange={setEndShiftOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" disabled={!activeShift || !selectedOrganizationId}>
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
                            <Button disabled={!!activeShift || !selectedOrganizationId}>
                                <PlayCircle className="mr-2 h-4 w-4" /> Mulai Shift
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="font-headline">Mulai Shift Baru</DialogTitle>
                                <DialogDescription>Masukkan saldo kas awal untuk shift baru ini.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="starting-cash" className="text-right">Kas Awal</Label>
                                    <Input id="starting-cash" type="number" value={startingCash} onChange={(e) => setStartingCash(parseFloat(e.target.value) || 0)} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter><Button onClick={handleStartShift} type="submit">Mulai Shift</Button></DialogFooter>
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
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                            ) : !selectedOrganizationId ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Pilih outlet untuk melihat data.</TableCell></TableRow>
                            ) : shifts.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Belum ada data shift.</TableCell></TableRow>
                            ) : (
                                shifts.map((shift) => (
                                    <TableRow key={shift.id}>
                                        <TableCell>
                                            <div className="font-medium">{shift.date}</div>
                                        </TableCell>
                                        <TableCell>{shift.cashier_name}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded-full ${shift.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-secondary'}`}>
                                                {shift.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(shift.start_amount)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(shift.end_amount)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
