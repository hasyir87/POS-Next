
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Payable = { id: string, vendor: string, dueDate: string, amount: number, status: "Tertunda" | "Lunas" };
type Receivable = { id: string, customer: string, dueDate: string, amount: number, status: "Tertunda" | "Lunas" };

const initialPayables: Payable[] = [
    { id: "PAY001", vendor: "Aroma Utama Supplier", dueDate: "2023-11-15", amount: 850000, status: "Tertunda" },
    { id: "PAY002", vendor: "Glass Bottle Supplier", dueDate: "2023-11-20", amount: 420500, status: "Tertunda" },
    { id: "PAY003", vendor: "Label Design Service", dueDate: "2023-10-30", amount: 300000, status: "Lunas" },
];

const initialReceivables: Receivable[] = [
    { id: "REC001", customer: "Luxury Hotel", dueDate: "2023-12-01", amount: 2500000, status: "Tertunda" },
    { id: "REC002", customer: "Corporate Client", dueDate: "2023-11-25", amount: 1200000, status: "Tertunda" },
    { id: "REC003", customer: "Event Organizer", dueDate: "2023-10-28", amount: 600000, status: "Lunas" },
];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function AccountsPage() {
    const { toast } = useToast();
    const [payables, setPayables] = useState<Payable[]>(initialPayables);
    const [receivables, setReceivables] = useState<Receivable[]>(initialReceivables);

    const [isPayableDialogOpen, setPayableDialogOpen] = useState(false);
    const [isReceivableDialogOpen, setReceivableDialogOpen] = useState(false);
    
    const [newPayable, setNewPayable] = useState({ vendor: '', amount: '', dueDate: '' });
    const [newReceivable, setNewReceivable] = useState({ customer: '', amount: '', dueDate: '' });

    const handleAddPayable = () => {
        if (!newPayable.vendor || !newPayable.amount || !newPayable.dueDate) {
            toast({ variant: "destructive", title: "Error", description: "Semua field harus diisi." });
            return;
        }
        const newEntry: Payable = {
            id: `PAY${(payables.length + 1).toString().padStart(3, '0')}`,
            vendor: newPayable.vendor,
            amount: parseFloat(newPayable.amount),
            dueDate: newPayable.dueDate,
            status: "Tertunda",
        };
        setPayables(prev => [...prev, newEntry]);
        toast({ title: "Sukses", description: "Utang baru berhasil ditambahkan." });
        setNewPayable({ vendor: '', amount: '', dueDate: '' });
        setPayableDialogOpen(false);
    };

    const handleAddReceivable = () => {
        if (!newReceivable.customer || !newReceivable.amount || !newReceivable.dueDate) {
            toast({ variant: "destructive", title: "Error", description: "Semua field harus diisi." });
            return;
        }
        const newEntry: Receivable = {
            id: `REC${(receivables.length + 1).toString().padStart(3, '0')}`,
            customer: newReceivable.customer,
            amount: parseFloat(newReceivable.amount),
            dueDate: newReceivable.dueDate,
            status: "Tertunda",
        };
        setReceivables(prev => [...prev, newEntry]);
        toast({ title: "Sukses", description: "Piutang baru berhasil ditambahkan." });
        setNewReceivable({ customer: '', amount: '', dueDate: '' });
        setReceivableDialogOpen(false);
    };

    const togglePayableStatus = (id: string) => {
        setPayables(payables.map(p => p.id === id ? { ...p, status: p.status === 'Lunas' ? 'Tertunda' : 'Lunas' } : p));
    };
    
    const deletePayable = (id: string) => {
        setPayables(payables.filter(p => p.id !== id));
        toast({ title: "Sukses", description: "Utang berhasil dihapus." });
    };

    const toggleReceivableStatus = (id: string) => {
        setReceivables(receivables.map(r => r.id === id ? { ...r, status: r.status === 'Lunas' ? 'Tertunda' : 'Lunas' } : r));
    };

    const deleteReceivable = (id: string) => {
        setReceivables(receivables.filter(r => r.id !== id));
        toast({ title: "Sukses", description: "Piutang berhasil dihapus." });
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold">Akun</h1>

            <Tabs defaultValue="payables">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="payables">Utang Usaha</TabsTrigger>
                    <TabsTrigger value="receivables">Piutang Usaha</TabsTrigger>
                </TabsList>
                <TabsContent value="payables">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Utang</CardTitle>
                                <CardDescription>Lacak semua faktur dan pembayaran ke pemasok.</CardDescription>
                            </div>
                             <Dialog open={isPayableDialogOpen} onOpenChange={setPayableDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2" /> Tambah Utang</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="font-headline">Tambah Utang Baru</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="vendor" className="text-right">Pemasok</Label>
                                            <Input id="vendor" value={newPayable.vendor} onChange={(e) => setNewPayable({...newPayable, vendor: e.target.value})} placeholder="Nama pemasok atau kreditur" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="amount" className="text-right">Jumlah</Label>
                                            <Input id="amount" type="number" value={newPayable.amount} onChange={(e) => setNewPayable({...newPayable, amount: e.target.value})} placeholder="Rp 0" className="col-span-3" />
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="due-date" className="text-right">Tanggal Jatuh Tempo</Label>
                                            <Input id="due-date" type="date" value={newPayable.dueDate} onChange={(e) => setNewPayable({...newPayable, dueDate: e.target.value})} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddPayable} type="submit">Simpan</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pemasok</TableHead>
                                        <TableHead>Jatuh Tempo</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payables.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.vendor}</TableCell>
                                            <TableCell>{item.dueDate}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={item.status === 'Lunas' ? 'secondary' : 'destructive'}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => togglePayableStatus(item.id)}>
                                                          {item.status === 'Lunas' ? 'Tandai sebagai Tertunda' : 'Tandai sebagai Lunas'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => deletePayable(item.id)}>Hapus</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="receivables">
                   <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Piutang</CardTitle>
                                <CardDescription>Lacak semua faktur dan pembayaran dari pelanggan.</CardDescription>
                            </div>
                            <Dialog open={isReceivableDialogOpen} onOpenChange={setReceivableDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2" /> Tambah Piutang</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="font-headline">Tambah Piutang Baru</DialogTitle>
                                    </DialogHeader>
                                     <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="customer" className="text-right">Pelanggan</Label>
                                            <Input id="customer" value={newReceivable.customer} onChange={(e) => setNewReceivable({...newReceivable, customer: e.target.value})} placeholder="Nama pelanggan" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="amount-rec" className="text-right">Jumlah</Label>
                                            <Input id="amount-rec" type="number" value={newReceivable.amount} onChange={(e) => setNewReceivable({...newReceivable, amount: e.target.value})} placeholder="Rp 0" className="col-span-3" />
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="due-date-rec" className="text-right">Tanggal Jatuh Tempo</Label>
                                            <Input id="due-date-rec" type="date" value={newReceivable.dueDate} onChange={(e) => setNewReceivable({...newReceivable, dueDate: e.target.value})} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddReceivable} type="submit">Simpan</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pelanggan</TableHead>
                                        <TableHead>Jatuh Tempo</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {receivables.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.customer}</TableCell>
                                            <TableCell>{item.dueDate}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={item.status === 'Lunas' ? 'secondary' : 'destructive'}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => toggleReceivableStatus(item.id)}>
                                                           {item.status === 'Lunas' ? 'Tandai sebagai Tertunda' : 'Tandai sebagai Lunas'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => deleteReceivable(item.id)}>Hapus</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
    