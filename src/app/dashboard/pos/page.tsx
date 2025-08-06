
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MinusCircle, X, Search, UserPlus, Droplets, SprayCan, Tag, User, XCircle } from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";

// --- SIMULASI DATA ---
// NOTE: In a real app, this data would be fetched from your database/backend.
const productCatalog = [
  { id: "PROD001", name: "Ocean Breeze", price: 79990, image: "https://placehold.co/100x100.png", stock: 15, "data-ai-hint": "perfume bottle" },
  { id: "PROD002", name: "Mystic Woods", price: 85000, image: "https://placehold.co/100x100.png", stock: 10, "data-ai-hint": "perfume bottle" },
  { id: "PROD003", name: "Citrus Grove", price: 75500, image: "https://placehold.co/100x100.png", stock: 20, "data-ai-hint": "perfume bottle" },
  { id: "PROD004", name: "Floral Fantasy", price: 92000, image: "https://placehold.co/100x100.png", stock: 8, "data-ai-hint": "perfume bottle" },
];

const initialMembers = [
    { value: "MEM001", label: "Andi Wijaya" },
    { value: "MEM002", label: "Bunga Citra" },
    { value: "MEM003", label: "Charlie Dharmawan" },
];

const initialPromotions = [
    { id: "promo_1", name: "Diskon Akhir Pekan", type: "Persentase", value: "15" },
    { id: "promo_2", name: "Potongan Langsung", type: "Nominal", value: "20000" },
];

const grades = [
    { value: "standard", label: "Standar" },
    { value: "premium", label: "Premium" },
];

const aromas = [
    { value: "sandalwood", label: "Sandalwood Supreme", grade: "standar" },
    { value: "vanilla", label: "Vanilla Orchid", grade: "standar" },
    { value: "ysl_black", label: "YSL Black Opium", grade: "premium" },
    { value: "baccarat", label: "Baccarat Rouge", grade: "premium" },
    { value: "aqua_digio", label: "Aqua di Gio", grade: "standar" },
    { value: "creed_aventus", label: "Creed Aventus", grade: "premium" },
];

const bottleSizes = [
    { value: 30, label: "Botol 30ml" },
    { value: 50, label: "Botol 50ml" },
    { value: 100, label: "Botol 100ml" },
]

const recipes: Record<string, Record<number, { essence: number; solvent: number; price: number }>> = {
    sandalwood: { 30: { essence: 12, solvent: 18, price: 50000 }, 50: { essence: 20, solvent: 30, price: 80000 }, 100: { essence: 38, solvent: 62, price: 160000 } },
    vanilla: { 30: { essence: 12, solvent: 18, price: 50000 }, 50: { essence: 20, solvent: 30, price: 80000 }, 100: { essence: 38, solvent: 62, price: 160000 } },
    ysl_black: { 30: { essence: 13, solvent: 17, price: 55000 }, 50: { essence: 22, solvent: 28, price: 90000 }, 100: { essence: 40, solvent: 60, price: 170000 } },
    baccarat: { 30: { essence: 13, solvent: 17, price: 55000 }, 50: { essence: 22, solvent: 28, price: 90000 }, 100: { essence: 40, solvent: 60, price: 170000 } },
    aqua_digio: { 30: { essence: 12, solvent: 18, price: 50000 }, 50: { essence: 20, solvent: 30, price: 80000 }, 100: { essence: 38, solvent: 62, price: 160000 } },
    creed_aventus: { 30: { essence: 15, solvent: 15, price: 65000 }, 50: { essence: 25, solvent: 25, price: 105000 }, 100: { essence: 45, solvent: 55, price: 200000 } },
};
const EXTRA_ESSENCE_PRICE_PER_ML = 3500;

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

const RefillForm = ({ onAddToCart }: { onAddToCart: (item: CartItem) => void }) => {
    const { toast } = useToast();
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedAroma, setSelectedAroma] = useState('');
    const [selectedBottleSize, setSelectedBottleSize] = useState(0);
    const [essenceMl, setEssenceMl] = useState(0);
    const [solventMl, setSolventMl] = useState(0);
    const [basePrice, setBasePrice] = useState(0);
    const [extraEssenceCost, setExtraEssenceCost] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [standardEssence, setStandardEssence] = useState(0);

    const availableAromas = useMemo(() => {
        if (!selectedGrade) return [];
        return aromas.filter(a => a.grade === selectedGrade);
    }, [selectedGrade]);
    
    useEffect(() => {
        setSelectedAroma('');
        setSelectedBottleSize(0);
    }, [selectedGrade]);

    useEffect(() => {
        if (selectedAroma && selectedBottleSize > 0) {
            const recipe = recipes[selectedAroma]?.[selectedBottleSize];
            if (recipe) {
                setEssenceMl(recipe.essence);
                setSolventMl(recipe.solvent);
                setBasePrice(recipe.price);
                setStandardEssence(recipe.essence);
            } else {
                setEssenceMl(0); setSolventMl(0); setBasePrice(0); setStandardEssence(0);
            }
        }
    }, [selectedAroma, selectedBottleSize]);

    useEffect(() => {
        if (selectedBottleSize > 0) {
            const cappedEssence = Math.min(essenceMl, selectedBottleSize);
            setSolventMl(selectedBottleSize - cappedEssence);
            const extraMl = Math.max(0, cappedEssence - standardEssence);
            const extraCost = extraMl * EXTRA_ESSENCE_PRICE_PER_ML;
            setExtraEssenceCost(extraCost);
            setTotalPrice(basePrice + extraCost);
        } else {
            setTotalPrice(0)
        }
    }, [essenceMl, selectedBottleSize, basePrice, standardEssence]);

    const handleAddToCart = () => {
        if (!selectedAroma || !selectedBottleSize) {
            toast({ variant: "destructive", title: "Error", description: "Harap pilih grade, aroma, dan ukuran botol." });
            return;
        }
        const aromaLabel = aromas.find(a => a.value === selectedAroma)?.label || 'Aroma';
        const cartItem: CartItem = {
            id: `refill-${Date.now()}`,
            name: `Isi Ulang: ${aromaLabel}`,
            price: totalPrice,
            quantity: 1,
            type: 'refill',
            details: `${selectedBottleSize}ml (${essenceMl}ml bibit, ${solventMl}ml camp.)`
        };
        onAddToCart(cartItem);
        toast({ title: "Sukses", description: `${aromaLabel} ditambahkan ke keranjang.` });
        setSelectedGrade(''); setSelectedAroma(''); setSelectedBottleSize(0); setEssenceMl(0);
    };

    return (
        <Card>
            <CardHeader><CardTitle>Formulir Isi Ulang Kustom</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>1. Pilih Grade</Label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger><SelectValue placeholder="Pilih grade parfum..." /></SelectTrigger>
                        <SelectContent>
                            {grades.map(g => (<SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedGrade && (<div className="space-y-2">
                    <Label>2. Pilih Aroma</Label>
                    <Combobox options={availableAromas} value={selectedAroma} onChange={setSelectedAroma} placeholder="Cari & pilih aroma..." searchPlaceholder="Ketik untuk mencari..." notFoundText="Aroma tidak ditemukan." />
                </div>)}
                {selectedAroma && (<div className="space-y-2">
                    <Label>3. Pilih Ukuran Botol</Label>
                    <Select value={selectedBottleSize.toString()} onValueChange={(v) => setSelectedBottleSize(Number(v) || 0)}>
                        <SelectTrigger><SelectValue placeholder="Pilih ukuran botol..." /></SelectTrigger>
                        <SelectContent>{bottleSizes.map(b => (<SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>))}</SelectContent>
                    </Select>
                </div>)}
                {selectedBottleSize > 0 && basePrice > 0 && (
                <Card className="bg-muted/50">
                    <CardHeader className="pb-4"><CardTitle className="text-base">4. Atur Komposisi</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <Label htmlFor="essence-ml">Bibit (ml)</Label>
                               <Input id="essence-ml" type="number" value={essenceMl} onChange={(e) => setEssenceMl(Math.max(1, Number(e.target.value)))} min="1"/>
                               <p className="text-xs text-muted-foreground">Resep: {standardEssence}ml</p>
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor="solvent-ml">Campuran (ml)</Label>
                               <Input id="solvent-ml" type="number" value={solventMl} readOnly disabled />
                           </div>
                        </div>
                        <Separator />
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Harga Resep Dasar</span><span>{formatCurrency(basePrice)}</span></div>
                             <div className="flex justify-between"><span className="text-muted-foreground">Biaya Tambahan Bibit</span><span>{formatCurrency(extraEssenceCost)}</span></div>
                             <div className="flex justify-between text-base font-bold"><span>Total Harga</span><span>{formatCurrency(totalPrice)}</span></div>
                        </div>
                    </CardContent>
                </Card>
                )}
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleAddToCart} disabled={!totalPrice || totalPrice <= 0}><PlusCircle className="mr-2"/> Tambah ke Keranjang</Button>
            </CardFooter>
        </Card>
    )
}

export default function PosPage() {
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCustomer, setActiveCustomer] = useState<{value: string, label: string} | null>(null);
    const [appliedPromo, setAppliedPromo] = useState<typeof initialPromotions[0] | null>(null);

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

    const handleSaveOrder = () => {
        toast({ title: "Pesanan Disimpan", description: "Pesanan saat ini telah disimpan untuk dilanjutkan nanti." });
    };

    const handleClearOrder = () => {
        setCart([]);
        setActiveCustomer(null);
        setAppliedPromo(null);
        toast({ title: "Pesanan Dibatalkan", description: "Keranjang dan pelanggan telah dibersihkan."});
    }

    const handleCheckout = () => {
        if (cart.length === 0) {
            toast({ variant: "destructive", title: "Keranjang Kosong", description: "Tidak dapat melakukan pembayaran dengan keranjang kosong." });
            return;
        }
        toast({ title: "Pembayaran Berhasil", description: "Pesanan telah dibayar dan transaksi selesai." });
        setCart([]);
        setActiveCustomer(null);
        setAppliedPromo(null);
    };

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

    const discount = useMemo(() => {
        if (!appliedPromo || subtotal === 0) return 0;
        if (appliedPromo.type === 'Persentase') {
            return subtotal * (parseFloat(appliedPromo.value) / 100);
        }
        if (appliedPromo.type === 'Nominal') {
            return Math.min(subtotal, parseFloat(appliedPromo.value));
        }
        return 0;
    }, [appliedPromo, subtotal]);

    const tax = useMemo(() => (subtotal - discount) * 0.11, [subtotal, discount]);
    const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            <div className="lg:col-span-2 flex flex-col gap-4">
                <Card className="flex-shrink-0">
                   <CardHeader>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Cari produk atau scan barcode..." className="pl-10" />
                        </div>
                   </CardHeader>
                </Card>
                <Tabs defaultValue="refills" className="flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="refills"><Droplets className="mr-2"/> Isi Ulang</TabsTrigger>
                        <TabsTrigger value="products"><SprayCan className="mr-2"/> Produk Jadi</TabsTrigger>
                    </TabsList>
                    <TabsContent value="refills" className="flex-grow mt-4">
                        <RefillForm onAddToCart={addRefillToCart} />
                    </TabsContent>
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
                </Tabs>
            </div>
            
            <div className="lg:col-span-1 flex flex-col gap-4">
                 <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Pesanan Saat Ini</CardTitle>
                        {activeCustomer ? (
                            <div className="pt-2">
                                <Badge variant="secondary" className="text-base font-medium p-2 w-full justify-between">
                                    <div className="flex items-center gap-2">
                                       <User className="h-4 w-4" />
                                       {activeCustomer.label}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setActiveCustomer(null)}><XCircle className="h-4 w-4 text-muted-foreground" /></Button>
                                </Badge>
                            </div>
                        ) : (
                            <div className="flex gap-2 pt-2">
                                <Combobox
                                    options={initialMembers}
                                    value={activeCustomer?.value || ''}
                                    onChange={(val) => setActiveCustomer(initialMembers.find(m => m.value === val) || null)}
                                    placeholder="Cari Pelanggan..."
                                    searchPlaceholder="Cari nama anggota..."
                                    notFoundText="Anggota tidak ditemukan."
                                />
                                <Button variant="outline" size="icon"><UserPlus /></Button>
                            </div>
                        )}
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
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill'} onClick={() => updateQuantity(item.id, item.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                                         <span className="w-6 text-center">{item.quantity}</span>
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill'} onClick={() => updateQuantity(item.id, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
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
                                    <p className="text-xs">Pilih produk atau isi ulang untuk memulai.</p>
                                </div>
                            )}
                        </CardContent>
                    </ScrollArea>
                    {cart.length > 0 && (
                        <>
                            <Separator />
                            <CardContent className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                                
                                {appliedPromo ? (
                                     <div className="flex justify-between text-destructive">
                                        <span>Diskon ({appliedPromo.name})</span>
                                        <span>- {formatCurrency(discount)}</span>
                                     </div>
                                ) : (
                                    <Select onValueChange={(promoId) => setAppliedPromo(initialPromotions.find(p => p.id === promoId) || null)}>
                                        <SelectTrigger className="h-auto py-1 text-xs">
                                            <SelectValue placeholder="Gunakan Promosi/Voucher" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialPromotions.map(promo => (
                                                <SelectItem key={promo.id} value={promo.id}>{promo.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                
                                <div className="flex justify-between"><span>Pajak (11%)</span><span>{formatCurrency(tax)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-3 gap-2 p-4">
                                <Button size="lg" variant="destructive" className="col-span-1" onClick={handleClearOrder}>Batal</Button>
                                <Button size="lg" variant="outline" className="col-span-1" onClick={handleSaveOrder}>Simpan</Button>
                                <Button size="lg" className="col-span-1" onClick={handleCheckout}>Bayar</Button>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}

