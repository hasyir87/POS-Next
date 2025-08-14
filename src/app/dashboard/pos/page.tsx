
"use client";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MinusCircle, PlusCircle, Search, Star, User, UserPlus, X, XCircle, Droplets, SprayCan } from "lucide-react";
import Image from "next/image";
import type { Product, Customer, Promotion, Grade, Aroma, BottleSize, Recipe } from "@/types/database";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const loyaltySettings = {
    threshold: 10,
    rewardType: 'FreeProduct',
    rewardValue: "50",
    freeProductId: "PROD005"
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'refill';
  details?: string;
  isPromo?: boolean;
};

type RecipeData = {
    [key: string]: { [key: number]: { essence: number; solvent: number; price: number } }
};

const RefillForm = ({ onAddToCart, grades, aromas, bottleSizes, recipes }: { onAddToCart: (item: CartItem) => void, grades: Partial<Grade>[], aromas: Partial<Aroma>[], bottleSizes: Partial<BottleSize>[], recipes: RecipeData }) => {
    const { toast } = useToast();
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [selectedAromaId, setSelectedAromaId] = useState('');
    const [selectedBottleSize, setSelectedBottleSize] = useState(0);
    const [essenceMl, setEssenceMl] = useState(0);
    const [solventMl, setSolventMl] = useState(0);
    const [basePrice, setBasePrice] = useState(0);
    const [extraEssenceCost, setExtraEssenceCost] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [standardEssence, setStandardEssence] = useState(0);

    const availableAromas = useMemo(() => {
        // This part seems to have a logical error. Aromas are not directly tied to grades in the DB schema.
        // For now, let's assume all aromas are available.
        return aromas.map(a => ({ value: a.id || '', label: a.name || '' }));
    }, [aromas]);
    
    useEffect(() => {
        setSelectedAromaId('');
        setSelectedBottleSize(0);
    }, [selectedGradeId]);

    useEffect(() => {
        if (selectedAromaId && selectedBottleSize > 0) {
            const recipe = recipes[selectedAromaId]?.[selectedBottleSize];
            if (recipe) {
                setEssenceMl(recipe.essence);
                setStandardEssence(recipe.essence);
                setBasePrice(recipe.price);
            }
        } else {
             setEssenceMl(0);
             setStandardEssence(0);
             setBasePrice(0);
        }
    }, [selectedAromaId, selectedBottleSize, recipes]);

    useEffect(() => {
        const grade = grades.find(g => g.id === selectedGradeId);
        if (selectedBottleSize > 0 && basePrice > 0 && grade) {
            const cappedEssence = Math.max(0, Math.min(essenceMl, selectedBottleSize));
            const newSolventMl = selectedBottleSize - cappedEssence;
            const extraMl = Math.max(0, cappedEssence - standardEssence);
            
            const extraCost = extraMl * (grade.extra_essence_price || 0);
            const finalBasePrice = basePrice * (grade.price_multiplier || 1);

            setSolventMl(newSolventMl);
            setExtraEssenceCost(extraCost);
            setTotalPrice(finalBasePrice + extraCost);
        } else {
            setTotalPrice(0);
            setExtraEssenceCost(0);
            setSolventMl(0);
        }
    }, [essenceMl, selectedBottleSize, basePrice, standardEssence, selectedGradeId, grades]);

    const handleAddToCart = () => {
        if (!selectedAromaId || !selectedBottleSize || !selectedGradeId) {
            toast({ variant: "destructive", title: "Error", description: "Harap pilih grade, aroma, dan ukuran botol." });
            return;
        }
        const aromaLabel = aromas.find(a => a.id === selectedAromaId)?.name || 'Aroma';
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
        setSelectedGradeId(''); setSelectedAromaId(''); setSelectedBottleSize(0); setEssenceMl(0);
    };
    
    const grade = grades.find(g => g.id === selectedGradeId);

    return (
        <Card>
            <CardHeader><CardTitle>Formulir Isi Ulang Kustom</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>1. Pilih Grade</Label>
                    <Select value={selectedGradeId} onValueChange={setSelectedGradeId}>
                        <SelectTrigger><SelectValue placeholder="Pilih grade parfum..." /></SelectTrigger>
                        <SelectContent>
                            {grades.map(g => (<SelectItem key={g.id} value={g.id || ''}>{g.name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedGradeId && (<div className="space-y-2">
                    <Label>2. Pilih Aroma</Label>
                    <Combobox options={availableAromas} value={selectedAromaId} onChange={setSelectedAromaId} placeholder="Cari & pilih aroma..." searchPlaceholder="Ketik untuk mencari..." notFoundText="Aroma tidak ditemukan." />
                </div>)}
                {selectedAromaId && (<div className="space-y-2">
                    <Label>3. Pilih Ukuran Botol</Label>
                    <Select value={selectedBottleSize > 0 ? selectedBottleSize.toString() : ""} onValueChange={(v) => setSelectedBottleSize(Number(v) || 0)}>
                        <SelectTrigger><SelectValue placeholder="Pilih ukuran botol..." /></SelectTrigger>
                        <SelectContent>{bottleSizes.map(b => (<SelectItem key={b.id} value={b.size?.toString()}>{b.size} {b.unit}</SelectItem>))}</SelectContent>
                    </Select>
                </div>)}
                {selectedBottleSize > 0 && basePrice > 0 && grade && (
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
                            <div className="flex justify-between"><span className="text-muted-foreground">Pengali Grade ({grade.price_multiplier}x)</span><span>{formatCurrency(basePrice * (grade.price_multiplier || 1) - basePrice)}</span></div>
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
    const { profile, selectedOrganizationId, loading: authLoading, supabase } = useAuth();
    
    const [productCatalog, setProductCatalog] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [grades, setGrades] = useState<Partial<Grade>[]>([]);
    const [aromas, setAromas] = useState<Partial<Aroma>[]>([]);
    const [bottleSizes, setBottleSizes] = useState<Partial<BottleSize>[]>([]);
    const [recipes, setRecipes] = useState<RecipeData>({});

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
    const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
    const [showLoyaltyReward, setShowLoyaltyReward] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const fetchPosData = useCallback(async () => {
        if (!selectedOrganizationId || !supabase) {
            setProductCatalog([]); setCustomers([]); setPromotions([]); setGrades([]); setAromas([]); setBottleSizes([]); setRecipes({});
            setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true);
        const [productsRes, customersRes, promotionsRes, gradesRes, aromasRes, bottleSizesRes, recipesRes] = await Promise.all([
            supabase.from('products').select('*').eq('organization_id', selectedOrganizationId),
            supabase.from('customers').select('*').eq('organization_id', selectedOrganizationId),
            supabase.from('promotions').select('*').eq('organization_id', selectedOrganizationId).eq('is_active', true),
            supabase.from('grades').select('*').eq('organization_id', selectedOrganizationId),
            supabase.from('aromas').select('*').eq('organization_id', selectedOrganizationId),
            supabase.from('bottle_sizes').select('*').eq('organization_id', selectedOrganizationId),
            supabase.from('recipes').select('*').eq('organization_id', selectedOrganizationId)
        ]);

        const errors = [productsRes.error, customersRes.error, promotionsRes.error, gradesRes.error, aromasRes.error, bottleSizesRes.error, recipesRes.error].filter(Boolean);
        if(errors.length > 0) {
            toast({ variant: "destructive", title: "Error Memuat Data", description: `Gagal memuat beberapa data. ${errors.map(e => e?.message).join(', ')}` });
        }

        setProductCatalog(productsRes.data || []);
        setCustomers(customersRes.data || []);
        setPromotions(promotionsRes.data || []);
        setGrades(gradesRes.data || []);
        setAromas(aromasRes.data || []);
        setBottleSizes(bottleSizesRes.data || []);
        
        if (recipesRes.data) {
            const recipesObj: RecipeData = {};
            const bottleSizeMap = new Map(bottleSizesRes.data?.map(bs => [bs.id, bs.size]));

            for (const r of recipesRes.data) {
                if(r.aroma_id && r.bottle_size_id && r.price) {
                    const bottleSize = bottleSizeMap.get(r.bottle_size_id);
                    if(bottleSize) {
                        if (!recipesObj[r.aroma_id]) recipesObj[r.aroma_id] = {};
                        // TODO: The essence/solvent values are placeholders and need to be added to the recipes table.
                        recipesObj[r.aroma_id][bottleSize] = { essence: 10, solvent: 20, price: r.price }; 
                    }
                }
            }
            setRecipes(recipesObj);
        }

        setIsLoadingData(false);
    }, [selectedOrganizationId, supabase, toast]);

    useEffect(() => {
      if(!authLoading && selectedOrganizationId){
        fetchPosData();
      } else if (!selectedOrganizationId && !authLoading) {
        setIsLoadingData(false);
      }
    }, [authLoading, selectedOrganizationId, fetchPosData]);

    const addProductToCart = (product: Product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { id: product.id, name: product.name, price: product.price, quantity: 1, type: 'product' }];
        });
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        setCart(prevCart => {
            const itemToUpdate = prevCart.find(item => item.id === itemId);
            if (itemToUpdate?.isPromo) return prevCart;

            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== itemId);
            }
            return prevCart.map(item =>
                item.id === itemId ? { ...item, quantity: newQuantity } : item
            );
        });
    };
    
    const handleClearOrder = () => {
        setCart([]);
        setAppliedPromo(null);
        setActiveCustomer(null);
        setShowLoyaltyReward(false);
        setPaymentMethod('cash');
    };

    const handleCheckout = async () => {
        if (cart.length === 0 || !profile || !selectedOrganizationId || !supabase) {
            toast({ variant: "destructive", title: "Keranjang Kosong", description: "Tidak bisa checkout dengan keranjang kosong." });
            return;
        }
        setIsCheckingOut(true);

        const { data, error } = await supabase.rpc('process_checkout', {
            p_organization_id: selectedOrganizationId,
            p_cashier_id: profile.id,
            p_customer_id: activeCustomer?.id,
            p_total_amount: total,
            p_payment_method: paymentMethod,
            p_items: cart.filter(item => !item.isPromo && item.type === 'product').map(item => ({ product_id: item.id, quantity: item.quantity, price: item.price }))
        });

        if (error) {
            toast({ variant: "destructive", title: "Checkout Gagal", description: error.message });
        } else {
            toast({ title: "Transaksi Berhasil!", description: "Pesanan telah berhasil diproses." });
            handleClearOrder();
        }
        setIsCheckingOut(false);
    };

    const memberOptions = useMemo(() => customers.map(m => ({ value: m.id, label: m.name })), [customers]);

    useEffect(() => {
        // BOGO logic
    }, [appliedPromo, cart, productCatalog]);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const discount = useMemo(() => {
        if (!appliedPromo || subtotal === 0 || appliedPromo.type === 'BOGO') return 0;
        if (appliedPromo.type === 'Persentase') return subtotal * (appliedPromo.value / 100);
        if (appliedPromo.type === 'Nominal') return Math.min(subtotal, appliedPromo.value);
        return 0;
    }, [appliedPromo, subtotal]);
    const tax = useMemo(() => (subtotal - discount) * 0.11, [subtotal, discount]);
    const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);

    if (authLoading) return <div className="p-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    
    if (!selectedOrganizationId) {
        return <div className="p-6 text-center text-muted-foreground">Pilih outlet dari menu di atas untuk memulai sesi Point of Sale.</div>
    }

    if (isLoadingData) return <div className="p-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

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
                        <RefillForm onAddToCart={(item) => setCart(p => [...p, item])} grades={grades} aromas={aromas} bottleSizes={bottleSizes} recipes={recipes} />
                    </TabsContent>
                    <TabsContent value="products" className="flex-grow mt-4">
                        <ScrollArea className="h-full">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-4">
                                {productCatalog.map(product => (
                                    <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors flex flex-col" onClick={() => addProductToCart(product)}>
                                        <CardContent className="p-2 flex-grow">
                                             <Image src={product.image_url || "https://placehold.co/100x100.png"} alt={product.name} width={100} height={100} className="w-full h-auto rounded-md aspect-square object-cover" data-ai-hint="perfume bottle"/>
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
                                            <TableRow key={item.id} className={item.isPromo ? "bg-muted/50" : ""}>
                                                <TableCell className="font-medium p-2 align-top">
                                                    <div className="flex gap-2 items-start">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-1" onClick={() => updateQuantity(item.id, 0)} disabled={item.isPromo}><X className="h-4 w-4 text-destructive" /></Button>
                                                        <div>
                                                            <p className="leading-tight font-semibold">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.details ? item.details : formatCurrency(item.price)}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2 align-top">
                                                    <div className="flex items-center justify-center gap-1 mt-1">
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill' || item.isPromo} onClick={() => updateQuantity(item.id, item.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                                         <span className="w-6 text-center">{item.quantity}</span>
                                                         <Button variant="outline" size="icon" className="h-6 w-6" disabled={item.type === 'refill' || item.isPromo} onClick={() => updateQuantity(item.id, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
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
                                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                                <div className="flex justify-between items-center text-destructive">
                                  <span>Diskon</span>
                                  <span>- {formatCurrency(discount)}</span>
                                </div>
                                <div className="flex justify-between"><span>Pajak (11%)</span><span>{formatCurrency(tax)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
                                <div className="mt-4">
                                  <Label>Metode Pembayaran</Label>
                                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Tunai</SelectItem>
                                      <SelectItem value="qris">QRIS</SelectItem>
                                      <SelectItem value="debit">Kartu Debit</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-2 p-4">
                                <Button size="lg" variant="destructive" onClick={handleClearOrder} disabled={isCheckingOut}>Batal</Button>
                                <Button size="lg" onClick={handleCheckout} disabled={isCheckingOut} className="col-span-1">
                                    {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Bayar
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}
