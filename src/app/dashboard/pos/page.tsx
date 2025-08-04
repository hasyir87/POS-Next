
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
import { Combobox } from "@/components/ui/combobox";

// --- SIMULASI DATA ---
// Produk Jadi
const productCatalog = [
  { id: "PROD001", name: "Ocean Breeze", price: 79990, image: "https://placehold.co/100x100.png", stock: 15, "data-ai-hint": "perfume bottle" },
  { id: "PROD002", name: "Mystic Woods", price: 85000, image: "https://placehold.co/100x100.png", stock: 10, "data-ai-hint": "perfume bottle" },
  { id: "PROD003", name: "Citrus Grove", price: 75500, image: "https://placehold.co/100x100.png", stock: 20, "data-ai-hint": "perfume bottle" },
  { id: "PROD004", name: "Floral Fantasy", price: 92000, image: "https://placehold.co/100x100.png", stock: 8, "data-ai-hint": "perfume bottle" },
];

// Resep & Bibit Parfum untuk Isi Ulang
const perfumeGrades = [
    { value: "standard", label: "Standar" },
    { value: "premium", label: "Premium" },
];

const availableAromas = [
    { id: "ARO001", name: "Sandalwood Supreme", grade: "standard", pricePerMlExtra: 3000 },
    { id: "ARO002", name: "Vanilla Orchid", grade: "standard", pricePerMlExtra: 2500 },
    { id: "ARO003", name: "YSL Black Opium", grade: "premium", pricePerMlExtra: 3500 },
    { id: "ARO004", name: "Baccarat Rouge", grade: "premium", pricePerMlExtra: 4500 },
];

const recipeBook = [
    { aromaId: "ARO003", bottleSize: 30, essenceMl: 13, solventMl: 17, basePrice: 55000 },
    { aromaId: "ARO003", bottleSize: 50, essenceMl: 22, solventMl: 28, basePrice: 85000 },
    { aromaId: "ARO003", bottleSize: 100, essenceMl: 40, solventMl: 60, basePrice: 150000 },
    { aromaId: "ARO001", bottleSize: 30, essenceMl: 15, solventMl: 15, basePrice: 45000 },
    { aromaId: "ARO001", bottleSize: 50, essenceMl: 25, solventMl: 25, basePrice: 70000 },
    { aromaId: "ARO001", bottleSize: 100, essenceMl: 45, solventMl: 55, basePrice: 125000 },
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
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedAroma, setSelectedAroma] = useState<string>('');
    const [selectedBottleSize, setSelectedBottleSize] = useState<number>(0);
    const [essenceMl, setEssenceMl] = useState<number>(0);
    const [solventMl, setSolventMl] = useState<number>(0);
    const [totalPrice, setTotalPrice] = useState<number>(0);

    const filteredAromas = availableAromas.filter(a => a.grade === selectedGrade);
    const recipe = recipeBook.find(r => r.aromaId === selectedAroma && r.bottleSize === selectedBottleSize);

    useEffect(() => {
        if (recipe) {
            setEssenceMl(recipe.essenceMl);
            setSolventMl(recipe.solventMl);
        } else {
            setEssenceMl(0);
            setSolventMl(0);
        }
    }, [recipe]);
    
    useEffect(() => {
        if(recipe) {
            const aromaDetails = availableAromas.find(a => a.id === selectedAroma);
            // Ensure essenceMl is at least the base recipe amount for calculation
            const currentEssence = Math.max(essenceMl, recipe.essenceMl);
            const extraEssence = Math.max(0, currentEssence - recipe.essenceMl);
            const extraCost = extraEssence * (aromaDetails?.pricePerMlExtra || 0);
            setTotalPrice(recipe.basePrice + extraCost);
        } else {
            setTotalPrice(0);
        }
    }, [essenceMl, recipe, selectedAroma]);

    const handleEssenceChange = (newEssenceMl: number) => {
        if (newEssenceMl < 0) newEssenceMl = 0;
        if (newEssenceMl > selectedBottleSize) newEssenceMl = selectedBottleSize;

        setEssenceMl(newEssenceMl);
        setSolventMl(selectedBottleSize - newEssenceMl);
    };
    
    const handleAddToCart = () => {
        const aroma = availableAromas.find(a => a.id === selectedAroma);
        if (!aroma || !recipe) {
             toast({ variant: "destructive", title: "Error", description: "Harap lengkapi semua pilihan resep." });
            return;
        }

        const cartItem: CartItem = {
            id: `refill-${Date.now()}`,
            name: `Isi Ulang: ${aroma.name}`,
            price: totalPrice,
            quantity: 1,
            type: 'refill',
            details: `${selectedBottleSize}ml (${essenceMl}ml bibit / ${solventMl}ml pelarut)`
        };

        onAddToCart(cartItem);
        // Reset form
        setSelectedGrade('');
        setSelectedAroma('');
        setSelectedBottleSize(0);
        toast({ title: "Sukses", description: `${aroma.name} ditambahkan ke keranjang.` });
    };
    
    const aromaOptions = filteredAromas.map(a => ({ value: a.id, label: a.name }));

    return (
        <Card>
            <CardHeader><CardTitle>Formulir Isi Ulang Kustom</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 {/* Step 1: Grade & Aroma */}
                <div className="space-y-2">
                    <Label>Langkah 1: Pilih Aroma</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Select value={selectedGrade} onValueChange={val => { setSelectedGrade(val); setSelectedAroma(''); setSelectedBottleSize(0);}}>
                            <SelectTrigger><SelectValue placeholder="Pilih Grade..." /></SelectTrigger>
                            <SelectContent>
                                {perfumeGrades.map(grade => (
                                    <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Combobox
                            options={aromaOptions}
                            value={selectedAroma}
                            onChange={val => { setSelectedAroma(val); setSelectedBottleSize(0); }}
                            placeholder="Pilih Aroma..."
                            searchPlaceholder="Cari aroma..."
                            emptyPlaceholder="Aroma tidak ditemukan."
                            disabled={!selectedGrade}
                         />
                    </div>
                </div>

                {/* Step 2: Bottle Size */}
                <div className="space-y-2">
                    <Label>Langkah 2: Pilih Ukuran Botol</Label>
                    <Select value={selectedBottleSize ? selectedBottleSize.toString() : ""} onValueChange={(val) => setSelectedBottleSize(parseInt(val, 10))} disabled={!selectedAroma}>
                        <SelectTrigger><SelectValue placeholder="Pilih Ukuran..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">30 ml</SelectItem>
                            <SelectItem value="50">50 ml</SelectItem>
                            <SelectItem value="100">100 ml</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Step 3: Customization */}
                {recipe && (
                     <Card className="bg-secondary/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Langkah 3: Atur Komposisi</CardTitle>
                            <CardDescription>Resep dasar: {recipe.essenceMl}ml Bibit & {recipe.solventMl}ml Pelarut</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="essence-ml">Bibit (ml)</Label>
                                    <Input id="essence-ml" type="number" value={essenceMl} onChange={e => handleEssenceChange(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="solvent-ml">Pelarut (ml)</Label>
                                    <Input id="solvent-ml" type="number" value={solventMl} readOnly disabled />
                                </div>
                            </div>
                             <div className="text-right">
                                <p className="text-sm text-muted-foreground">Harga Dasar: {formatCurrency(recipe.basePrice)}</p>
                                {totalPrice > recipe.basePrice && (
                                    <p className="text-sm text-green-600 font-medium">Biaya Tambahan: +{formatCurrency(totalPrice - recipe.basePrice)}</p>
                                )}
                                <p className="text-xl font-bold">Total: {formatCurrency(totalPrice)}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleAddToCart} disabled={!recipe}>
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

