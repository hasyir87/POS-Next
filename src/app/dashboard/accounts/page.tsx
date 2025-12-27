
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';

type Payable = { id: string, organization_id: string, vendor: string, dueDate: string, amount: number, status: "Tertunda" | "Lunas" };
type Receivable = { id: string, organization_id: string, customer: string, dueDate: string, amount: number, status: "Tertunda" | "Lunas" };

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function AccountsPage() {
    const { toast } = useToast();
    const { selectedOrganizationId, loading: authLoading } = useAuth();
    const db = getFirestore(firebaseApp);

    const [payables, setPayables] = useState<Payable[]>([]);
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isPayableDialogOpen, setPayableDialogOpen] = useState(false);
    const [isReceivableDialogOpen, setReceivableDialogOpen] = useState(false);
    
    const [newPayable, setNewPayable] = useState({ vendor: '', amount: '', dueDate: '' });
    const [newReceivable, setNewReceivable] = useState({ customer: '', amount: '', dueDate: '' });
    
    const fetchData = useCallback(async (collectionName: 'payables' | 'receivables', setData: React.Dispatch<React.SetStateAction<any[]>>) => {
        if (!selectedOrganizationId) {
            setData([]);
            return;
        }
        try {
            const q = query(collection(db, collectionName), where("organization_id", "==", selectedOrganizationId), orderBy("dueDate", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(data);
        } catch (error) {
            console.error(`Error fetching ${collectionName}:`, error);
            toast({ variant: "destructive", title: "Error", description: `Gagal mengambil data ${collectionName}.` });
        }
    }, [selectedOrganizationId, db, toast]);


    useEffect(() => {
        if (!authLoading && selectedOrganizationId) {
            setIsLoading(true);
            Promise.all([
                fetchData('payables', setPayables),
                fetchData('receivables', setReceivables)
            ]).finally(() => setIsLoading(false));
        } else if (!authLoading) {
            setIsLoading(false);
            setPayables([]);
            setReceivables([]);
        }
    }, [authLoading, selectedOrganizationId, fetchData]);

    const handleAddOrUpdate = async (type: 'payable' | 'receivable', data: any) => {
        const collectionName = type === 'payable' ? 'payables' : 'receivables';
        const docData = {
            ...data,
            organization_id: selectedOrganizationId,
            updated_at: serverTimestamp()
        };

        try {
            if (data.id) {
                const docRef = doc(db, collectionName, data.id);
                await updateDoc(docRef, docData);
            } else {
                await addDoc(collection(db, collectionName), { ...docData, created_at: serverTimestamp() });
            }
            toast({ title: "Sukses", description: `${type === 'payable' ? 'Utang' : 'Piutang'} berhasil disimpan.` });
            return true;
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
            return false;
        }
    };

    const handleAddPayable = async () => {
        if (!newPayable.vendor || !newPayable.amount || !newPayable.dueDate || !selectedOrganizationId) {
            toast({ variant: "destructive", title: "Error", description: "Semua field harus diisi." });
            return;
        }
        const success = await handleAddOrUpdate('payable', {
            vendor: newPayable.vendor,
            amount: parseFloat(newPayable.amount),
            dueDate: newPayable.dueDate,
            status: "Tertunda",
        });
        if (success) {
            setPayableDialogOpen(false);
            setNewPayable({ vendor: '', amount: '', dueDate: '' });
            fetchData('payables', setPayables);
        }
    };

    const handleAddReceivable = async () => {
        if (!newReceivable.customer || !newReceivable.amount || !newReceivable.dueDate || !selectedOrganizationId) {
            toast({ variant: "destructive", title: "Error", description: "Semua field harus diisi." });
            return;
        }
         const success = await handleAddOrUpdate('receivable', {
            customer: newReceivable.customer,
            amount: parseFloat(newReceivable.amount),
            dueDate: newReceivable.dueDate,
            status: "Tertunda",
        });
        if (success) {
            setReceivableDialogOpen(false);
            setNewReceivable({ customer: '', amount: '', dueDate: '' });
            fetchData('receivables', setReceivables);
        }
    };

    const toggleStatus = async (type: 'payable' | 'receivable', id: string, currentStatus: "Lunas" | "Tertunda") => {
        const collectionName = type === 'payable' ? 'payables' : 'receivables';
        const docRef = doc(db, collectionName, id);
        try {
            await updateDoc(docRef, { status: currentStatus === 'Lunas' ? 'Tertunda' : 'Lunas' });
            if (type === 'payable') fetchData('payables', setPayables);
            else fetchData('receivables', setReceivables);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleDelete = async (type: 'payable' | 'receivable', id: string) => {
        const collectionName = type === 'payable' ? 'payables' : 'receivables';
        try {
            await deleteDoc(doc(db, collectionName, id));
            toast({ title: "Sukses", description: "Data berhasil dihapus." });
            if (type === 'payable') fetchData('payables', setPayables);
            else fetchData('receivables', setReceivables);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    if (authLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

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
                                    <Button disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Utang</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">Tambah Utang Baru</DialogTitle></DialogHeader>
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
                                            <Label htmlFor="due-date" className="text-right">Tgl Jatuh Tempo</Label>
                                            <Input id="due-date" type="date" value={newPayable.dueDate} onChange={(e) => setNewPayable({...newPayable, dueDate: e.target.value})} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter><Button onClick={handleAddPayable} type="submit">Simpan</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Pemasok</TableHead><TableHead>Jatuh Tempo</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={5} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : !selectedOrganizationId ? (
                                        <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Pilih outlet untuk melihat data.</TableCell></TableRow>
                                    ) : payables.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Belum ada data utang.</TableCell></TableRow>
                                    ) : (
                                        payables.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.vendor}</TableCell>
                                                <TableCell>{item.dueDate}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                                <TableCell className="text-center"><Badge variant={item.status === 'Lunas' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => toggleStatus('payable', item.id, item.status)}>{item.status === 'Lunas' ? 'Tandai Tertunda' : 'Tandai Lunas'}</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete('payable', item.id)}>Hapus</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="receivables">
                   <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Piutang</CardTitle><CardDescription>Lacak semua faktur dan pembayaran dari pelanggan.</CardDescription></div>
                            <Dialog open={isReceivableDialogOpen} onOpenChange={setReceivableDialogOpen}>
                                <DialogTrigger asChild><Button disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Piutang</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">Tambah Piutang Baru</DialogTitle></DialogHeader>
                                     <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="customer" className="text-right">Pelanggan</Label><Input id="customer" value={newReceivable.customer} onChange={(e) => setNewReceivable({...newReceivable, customer: e.target.value})} placeholder="Nama pelanggan" className="col-span-3" /></div>
                                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="amount-rec" className="text-right">Jumlah</Label><Input id="amount-rec" type="number" value={newReceivable.amount} onChange={(e) => setNewReceivable({...newReceivable, amount: e.target.value})} placeholder="Rp 0" className="col-span-3" /></div>
                                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="due-date-rec" className="text-right">Tgl Jatuh Tempo</Label><Input id="due-date-rec" type="date" value={newReceivable.dueDate} onChange={(e) => setNewReceivable({...newReceivable, dueDate: e.target.value})} className="col-span-3" /></div>
                                    </div>
                                    <DialogFooter><Button onClick={handleAddReceivable} type="submit">Simpan</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Pelanggan</TableHead><TableHead>Jatuh Tempo</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {isLoading ? (
                                        <TableRow><TableCell colSpan={5} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : !selectedOrganizationId ? (
                                        <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Pilih outlet untuk melihat data.</TableCell></TableRow>
                                    ) : receivables.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Belum ada data piutang.</TableCell></TableRow>
                                    ) : (
                                        receivables.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.customer}</TableCell>
                                                <TableCell>{item.dueDate}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                                <TableCell className="text-center"><Badge variant={item.status === 'Lunas' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => toggleStatus('receivable', item.id, item.status)}>{item.status === 'Lunas' ? 'Tandai Tertunda' : 'Tandai Lunas'}</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete('receivable', item.id)}>Hapus</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                     )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
