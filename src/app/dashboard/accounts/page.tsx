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

const payables = [
    { id: "PAY001", vendor: "Supplier Aroma Utama", dueDate: "2023-11-15", amount: "$850.00", status: "Belum Lunas" },
    { id: "PAY002", vendor: "Pemasok Botol Kaca", dueDate: "2023-11-20", amount: "$420.50", status: "Belum Lunas" },
    { id: "PAY003", vendor: "Jasa Desain Label", dueDate: "2023-10-30", amount: "$300.00", status: "Lunas" },
];

const receivables = [
    { id: "REC001", customer: "Hotel Mewah", dueDate: "2023-12-01", amount: "$2,500.00", status: "Belum Lunas" },
    { id: "REC002", customer: "Klien Korporat", dueDate: "2023-11-25", amount: "$1,200.00", status: "Belum Lunas" },
    { id: "REC003", customer: "Penyelenggara Acara", dueDate: "2023-10-28", amount: "$600.00", status: "Lunas" },
];


export default function AccountsPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold">Utang & Piutang</h1>

            <Tabs defaultValue="payables">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="payables">Utang (Accounts Payable)</TabsTrigger>
                    <TabsTrigger value="receivables">Piutang (Accounts Receivable)</TabsTrigger>
                </TabsList>
                <TabsContent value="payables">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Daftar Utang</CardTitle>
                                <CardDescription>Melacak semua tagihan dan pembayaran kepada pemasok.</CardDescription>
                            </div>
                             <Dialog>
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
                                            <Input id="vendor" placeholder="Nama pemasok atau kreditur" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="amount" className="text-right">Jumlah</Label>
                                            <Input id="amount" type="number" placeholder="$0.00" className="col-span-3" />
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="due-date" className="text-right">Jatuh Tempo</Label>
                                            <Input id="due-date" type="date" className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit">Simpan</Button>
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
                                            <TableCell className="text-right">{item.amount}</TableCell>
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
                                                        <DropdownMenuItem>Tandai Lunas</DropdownMenuItem>
                                                        <DropdownMenuItem>Hapus</DropdownMenuItem>
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
                                <CardTitle>Daftar Piutang</CardTitle>
                                <CardDescription>Melacak semua faktur dan pembayaran dari pelanggan.</CardDescription>
                            </div>
                            <Dialog>
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
                                            <Input id="customer" placeholder="Nama pelanggan" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="amount-rec" className="text-right">Jumlah</Label>
                                            <Input id="amount-rec" type="number" placeholder="$0.00" className="col-span-3" />
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="due-date-rec" className="text-right">Jatuh Tempo</Label>
                                            <Input id="due-date-rec" type="date" className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit">Simpan</Button>
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
                                            <TableCell className="text-right">{item.amount}</TableCell>
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
                                                        <DropdownMenuItem>Tandai Lunas</DropdownMenuItem>
                                                        <DropdownMenuItem>Hapus</DropdownMenuItem>
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
