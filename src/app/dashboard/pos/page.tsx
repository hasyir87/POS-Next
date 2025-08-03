
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MinusCircle, X, Search, UserPlus, Droplets, SprayCan } from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- SIMULASI DATA ---
// Di aplikasi nyata, data ini akan datang dari database (Firestore)
const productCatalog = [
  { id: "PROD001", name: "Ocean Breeze", price: 79990, image: "https://placehold.co/100x100.png", stock: 15 },
  { id: "PROD002", name: "Mystic Woods", price: 85000, image: "https://placehold.co/100x100.png", stock: 10 },
  { id: "PROD003", name: "Citrus Grove", price: 75500, image: "https://placehold.co/100x100.png", stock: 20 },
  { id: "PROD004", name: "Floral Fantasy", price: 92000, image: "https://placehold.co/100x100.png", stock: 8 },
  { id: "PROD005", name: "Spiced Amber", price: 110000, image: "https://placehold.co/100x100.png", stock: 12 },
  { id: "PROD006", name: "Vanilla Dream", price: 68000, image: "https://placehold.co/100x100.png", stock: 25 },
];

const availableEssences = [
    { id: "MAT001", name: "Rose Absolute", pricePerMl: 1500 },
    { id: "MAT002", name: "Jasmine Sambac", pricePerMl: 1800 },
    { id: "MAT003", name: "Bergamot Oil", pricePerMl: 800 },
];

const availableBottles = [
    { id: "MAT009", name: "Botol Kaca 50ml", price: 3500 },
    { id: "MAT010", name: "Botol Kaca 100ml", price: 5000 },
]

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'refill';
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function PosPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [refillForm, setRefillForm] = useState({ essenceId: "", bottleId: "", quantityMl: 30 });

    const addToCart = (product: typeof productCatalog[0]) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1, type: 'product' }];
        });
    };

    const addRefillToCart = () => {
        const essence = availableEssences.find(e => e.id === refillForm.essenceId);
        const bottle = availableBottles.find(b => b.id === refillForm.bottleId);

        if (!essence || !refillForm.quantityMl) return;

        const essencePrice = essence.pricePerMl * refillForm.quantityMl;
        const bottlePrice = bottle?.price || 0;
        const totalRefillPrice = essencePrice + bottlePrice;

        const refillName = `Isi Ulang: ${essence.name} (${refillForm.quantityMl}ml)${bottle ? ` + ${bottle.name}` : ''}`;
        
        const newCartItem: CartItem = {
            id: `refill-${Date.now()}`,
            name: refillName,
            price: totalRefillPrice,
            quantity: 1,
            type: 'refill'
        };

        setCart(prev => [...prev, newCartItem]);
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCart(prevCart => prevCart.filter(item => item.id !== itemId));
        } else {
            setCart(prevCart => prevCart.map(item => 
                item.id === itemId ? { ...item, quantity: newQuantity } : item
            ));
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.11; // PPN 11%
    const total = subtotal + tax;

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Kolom Produk & Isi Ulang */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <Card className="flex-shrink-0">
                   <CardHeader>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Cari produk atau scan barcode..." className="pl-10" />
                        </div>
                   </CardHeader>
                </Card>
                <Tabs defaultValue="products" className="flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="products"><SprayCan className="mr-2"/> Produk Jadi</TabsTrigger>
                        <TabsTrigger value="refills"><Droplets className="mr-2"/> Isi Ulang</TabsTrigger>
                    </TabsList>
                    <TabsContent value="products" className="flex-grow mt-4">
                        <ScrollArea className="h-full">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-4">
                                {productCatalog.map(product => (
                                    <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors flex flex-col" onClick={() => addToCart(product)}>
                                        <CardContent className="p-2 flex-grow">
                                             <Image src={product.image} alt={product.name} width={100} height={100} className="w-full h-auto rounded-md aspect-square object-cover" data-ai-hint="perfume bottle"/>
                                        </CardContent>
                                        <CardFooter className="p-2 flex-col items-start">
                                            <p className="font-semibold text-sm leading-tight">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="refills" className="flex-grow mt-4">
                        <Card>
                            <CardHeader><CardTitle>Formulir Isi Ulang</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="space-y-2">
                                    <Label htmlFor="essence">Pilih Bibit Parfum</Label>
                                    <Select onValueChange={(value) => setRefillForm(prev => ({...prev, essenceId: value}))}>
                                        <SelectTrigger id="essence">
                                            <SelectValue placeholder="Pilih bibit parfum..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableEssences.map(essence => (
                                                <SelectItem key={essence.id} value={essence.id}>{essence.name} ({formatCurrency(essence.pricePerMl)}/ml)</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bottle">Pilih Botol (Opsional)</Label>
                                    <Select onValueChange={(value) => setRefillForm(prev => ({...prev, bottleId: value}))}>
                                        <SelectTrigger id="bottle">
                                            <SelectValue placeholder="Botol milik pelanggan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Botol milik pelanggan</SelectItem>
                                            {availableBottles.map(bottle => (
                                                <SelectItem key={bottle.id} value={bottle.id}>{bottle.name} (+{formatCurrency(bottle.price)})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Jumlah (ml)</Label>
                                    <Input id="quantity" type="number" value={refillForm.quantityMl} onChange={(e) => setRefillForm(prev => ({...prev, quantityMl: parseInt(e.target.value) || 0}))} placeholder="e.g. 50" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={addRefillToCart}>
                                    <PlusCircle className="mr-2"/> Tambah ke Keranjang
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            
            {/* Kolom Keranjang */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                 <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Pesanan Saat Ini</CardTitle>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="w-full"><Search className="mr-2" /> Cari Pelanggan</Button>
                            <Button variant="outline" size="sm"><UserPlus /></Button>
                        </div>
                    </CardHeader>
                    <Separator />
                    <ScrollArea className="flex-grow">
                        <CardContent className="p-0">
                            {cart.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-center w-[100px]">Jml</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium p-2">
                                                    <div className="flex gap-2 items-center">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 0)}><X className="h-4 w-4 text-destructive" /></Button>
                                                        <div>
                                                            <p className="leading-tight">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <div className="flex items-center justify-center gap-1">
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill'} onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                            <MinusCircle className="h-4 w-4" />
                                                         </Button>
                                                         <span className="w-6 text-center">{item.quantity}</span>
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill'} onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                            <PlusCircle className="h-4 w-4" />
                                                         </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right p-2">{formatCurrency(item.price * item.quantity)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="p-6 text-center text-muted-foreground">
                                    <p>Keranjang kosong</p>
                                </div>
                            )}
                        </CardContent>
                    </ScrollArea>
                    {cart.length > 0 && (
                        <>
                            <Separator />
                            <CardContent className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Pajak (11%)</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-2 p-4">
                                <Button size="lg" variant="outline">Simpan</Button>
                                <Button size="lg">Bayar</Button>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}
