import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, PlayCircle } from "lucide-react";

const shiftHistory = [
    { id: "SFT001", date: "2023-10-26", cashier: "Alice", start: "Rp 150.000", end: "Rp 1.632.500", status: "Ditutup" },
    { id: "SFT002", date: "2023-10-26", cashier: "Bob", start: "Rp 150.000", end: "Rp 1.450.750", status: "Ditutup" },
    { id: "SFT003", date: "2023-10-27", cashier: "Alice", start: "Rp 150.000", end: "Rp 1.780.000", status: "Ditutup" },
    { id: "SFT004", date: "2023-10-27", cashier: "Charlie", start: "Rp 150.000", end: "Rp 980.250", status: "Ditutup" },
    { id: "SFT005", date: "2023-10-28", cashier: "Bob", start: "Rp 150.000", end: "---", status: "Aktif" },
];

export default function ShiftsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Manajemen Shift</h1>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
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
                                    <Input id="ending-cash" defaultValue="Rp 0" className="col-span-3" />
                                </div>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Ringkasan Shift</CardDescription>
                                        <CardTitle className="text-2xl">Rp 1.300.750</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground">+ Rp 1.150.750 dari penjualan tunai</div>
                                    </CardContent>
                                </Card>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Konfirmasi & Akhiri Shift</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
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
                                    <Input id="starting-cash" defaultValue="Rp 150.000" className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Mulai Shift</Button>
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
                            {shiftHistory.map((shift) => (
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
                                    <TableCell className="text-right">{shift.start}</TableCell>
                                    <TableCell className="text-right">{shift.end}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
