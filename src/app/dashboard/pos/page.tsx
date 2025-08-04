
"use client";

import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// --- SIMULASI DATA ---
// Produk Jadi
const productCatalog = [
  { id: "PROD001", name: "Ocean Breeze", price: 79990, image: "https://placehold.co/100x100.png", stock: 15, "data-ai-hint": "perfume bottle" },
  { id: "PROD002", name: "Mystic Woods", price: 85000, image: "https://placehold.co/100x100.png", stock: 10, "data-ai-hint": "perfume bottle" },
  { id: "PROD003", name: "Citrus Grove", price: 75500, image: "https://placehold.co/100x100.png", stock: 20, "data-ai-hint": "perfume bottle" },
  { id: "PROD004", name: "Floral Fantasy", price: 92000, image: "https://placehold.co/100x100.png", stock: 8, "data-ai-hint": "perfume bottle" },
];

// Bibit Parfum untuk Isi Ulang
const availableAromas = [
    { value: "sandalwood", label: "Sandalwood Supreme" },
    { value: "vanilla", label: "Vanilla Orchid" },
    { value: "ysl_black", label: "YSL Black Opium" },
    { value: "baccarat", label: "Baccarat Rouge" },
];

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'refill';
  details?: string;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Komponen Form Isi Ulang
const RefillForm = ({ onAddToCart }: { onAddToCart: (item: CartItem) => void }) => {
    const { toast } = useToast();
    const [selectedAroma, setSelectedAroma] = useState('');
    const [selectedBottle, setSelectedBottle] = useState('');
    const [refillAmount, setRefillAmount] = useState(30); // Default 30ml
    const [totalPrice, setTotalPrice] = useState(0);

    // Simulasi kalkulasi harga
    useEffect(() => {
        const basePricePerMl = 1500; // Harga dasar per ml
        let price = refillAmount * basePricePerMl;

        // Tambahan harga untuk aroma premium
        if (selectedAroma === 'ysl_black' || selectedAroma === 'baccarat') {
            price += 15000;
        }
        // Tambahan harga untuk botol baru
        if (selectedBottle === '30ml') price += 5000;
        if (selectedBottle === '50ml') price += 7500;
        if (selectedBottle === '100ml') price += 10000;
        
        setTotalPrice(price);

    }, [selectedAroma, selectedBottle, refillAmount]);


    const handleAddToCart = () => {
        if (!selectedAroma) {
            toast({ variant: "destructive", title: "Error", description: "Harap pilih aroma." });
            return;
        }

        const aromaLabel = availableAromas.find(a => a.value === selectedAroma)?.label || 'Aroma';
        const bottleLabel = selectedBottle ? `${selectedBottle} Botol Baru` : 'Botol Pelanggan';

        const cartItem: CartItem = {
            id: `refill-${Date.now()}`,
            name: `Isi Ulang: ${aromaLabel}`,
            price: totalPrice,
            quantity: 1,
            type: 'refill',
            details: `${refillAmount}ml, ${bottleLabel}`
        };
        onAddToCart(cartItem);
        toast({ title: "Sukses", description: `${aromaLabel} ditambahkan ke keranjang.` });
    };

    return (
        <Card>
            <CardHeader><CardTitle>Formulir Isi Ulang</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Pilih Aroma</Label>
                    <Select value={selectedAroma} onValueChange={setSelectedAroma}>
                        <SelectTrigger><SelectValue placeholder="Pilih bibit parfum..." /></SelectTrigger>
                        <SelectContent>
                            {availableAromas.map(aroma => (
                                <SelectItem key={aroma.value} value={aroma.value}>{aroma.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="refill-amount">Jumlah Isi Ulang (ml)</Label>
                    <Input id="refill-amount" type="number" value={refillAmount} onChange={(e) => setRefillAmount(parseInt(e.target.value, 10) || 0)} placeholder="e.g. 30"/>
                </div>
                 <div className="space-y-2">
                    <Label>Pilih Botol (Opsional)</Label>
                    <Select value={selectedBottle} onValueChange={setSelectedBottle}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenis botol..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customer-bottle">Botol milik pelanggan</SelectItem>
                            <SelectItem value="30ml">Botol Baru 30ml</SelectItem>
                            <SelectItem value="50ml">Botol Baru 50ml</SelectItem>
                             <SelectItem value="100ml">Botol Baru 100ml</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="text-right">
                    <p className="text-sm text-muted-foreground">Estimasi Harga</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalPrice)}</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleAddToCart}>
                    <PlusCircle className="mr-2"/> Tambah ke Keranjang
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function PosPage() {
    const [cart, setCart] = useState<CartItem[]>([]);

    const addProductToCart = (product: typeof productCatalog[0]) => {
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
    
    const addRefillToCart = (item: CartItem) => {
        setCart(prev => [...prev, item]);
    }

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
                                    <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors flex flex-col" onClick={() => addProductToCart(product)}>
                                        <CardContent className="p-2 flex-grow">
                                             <Image src={product.image} alt={product.name} width={100} height={100} className="w-full h-auto rounded-md aspect-square object-cover" data-ai-hint={product['data-ai-hint']}/>
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
                        <RefillForm onAddToCart={addRefillToCart} />
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
                                                <TableCell className="font-medium p-2 align-top">
                                                    <div className="flex gap-2 items-start">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-1" onClick={() => updateQuantity(item.id, 0)}><X className="h-4 w-4 text-destructive" /></Button>
                                                        <div>
                                                            <p className="leading-tight font-semibold">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.details ? item.details : formatCurrency(item.price)}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2 align-top">
                                                    <div className="flex items-center justify-center gap-1 mt-1">
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill'} onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                            <MinusCircle className="h-4 w-4" />
                                                         </Button>
                                                         <span className="w-6 text-center">{item.quantity}</span>
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill'} onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                            <PlusCircle className="h-4 w-4" />
                                                         </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right p-2 align-top font-medium">{formatCurrency(item.price * item.quantity)}</TableCell>
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

