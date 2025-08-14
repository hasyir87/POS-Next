
"use client";

// Utility untuk format mata uang
export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Loyalty settings (sementara, bisa diganti dinamis)
const loyaltySettings = {
    threshold: 10,
    rewardType: 'FreeProduct',
    rewardValue: "50",
    freeProductId: "PROD005"
};
// Import semua komponen UI dan hooks yang diperlukan
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle, XCircle, Loader2 } from "lucide-react"; // Import Loader2
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
const EXTRA_ESSENCE_PRICE_PER_ML = 3500;
// Deklarasi tipe agar dikenali TypeScript
type Product = {
    id: string;
    name: string;
    price: number;
    image_url: string;
    stock: number;
};

type Customer = {
    id: string;
    name: string;
    total_transactions: number;
};

type Promotion = {
    id: string;
    name: string;
    type: 'Persentase' | 'Nominal' | 'BOGO';
    value: number;
    get_product_id: string | null;
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

// Pastikan import React dan hooks
import React, { useState, useEffect, useMemo } from "react";

// RefillForm menerima data dinamis dari props
type RefillFormProps = {
    onAddToCart: (item: CartItem) => void;
    grades: { value: string; label: string }[];
    aromas: { value: string; label: string; grade: string }[];
    bottleSizes: { value: number; label: string }[];
    recipes: Record<string, Record<number, { essence: number; solvent: number; price: number }>>;
};

const RefillForm = ({ onAddToCart, grades, aromas, bottleSizes, recipes }: RefillFormProps) => {
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
    }, [selectedGrade, aromas]);

    useEffect(() => {
        setSelectedAroma('');
        setSelectedBottleSize(0);
    }, [selectedGrade]);

    useEffect(() => {
        if (selectedAroma && selectedBottleSize > 0) {
            const recipe = recipes[selectedAroma]?.[selectedBottleSize];
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
    }, [selectedAroma, selectedBottleSize, recipes]);

    useEffect(() => {
        if (selectedBottleSize > 0 && basePrice > 0) {
            const cappedEssence = Math.max(0, Math.min(essenceMl, selectedBottleSize));
            const newSolventMl = selectedBottleSize - cappedEssence;
            const extraMl = Math.max(0, cappedEssence - standardEssence);
            const extraCost = extraMl * EXTRA_ESSENCE_PRICE_PER_ML;
            setSolventMl(newSolventMl);
            setExtraEssenceCost(extraCost);
            setTotalPrice(basePrice + extraCost);
        } else {
            setTotalPrice(0);
            setExtraEssenceCost(0);
            setSolventMl(0);
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
                    <Select value={selectedBottleSize > 0 ? selectedBottleSize.toString() : ""} onValueChange={(v) => setSelectedBottleSize(Number(v) || 0)}>
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
    );
};

export default function PosPage() {
    const { toast } = useToast();
    const { user, selectedOrganizationId, loading: authLoading } = useAuth();
    // State
    const [productCatalog, setProductCatalog] = useState<Product[]>([]);
    const [members, setMembers] = useState<Customer[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [grades, setGrades] = useState<{ value: string; label: string }[]>([]);
    const [aromas, setAromas] = useState<{ value: string; label: string; grade: string }[]>([]);
    const [bottleSizes, setBottleSizes] = useState<{ value: number; label: string }[]>([]);
    const [recipes, setRecipes] = useState<Record<string, Record<number, { essence: number; solvent: number; price: number }>>>({});
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
    const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
    const [showLoyaltyReward, setShowLoyaltyReward] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    useEffect(() => {
        const fetchPosData = async () => {
            if (!selectedOrganizationId) {
                // Clear all data if no organization is selected
                setProductCatalog([]); setMembers([]); setPromotions([]); setGrades([]); setAromas([]); setBottleSizes([]); setRecipes({});
                setIsLoadingData(false);
                return;
            }
            setIsLoadingData(true);
            const [productsResult, customersResult, promotionsResult, gradesResult, aromasResult, bottleSizesResult, recipesResult] = await Promise.all([
                supabase.from('products').select('id, name, price, image_url, stock').eq('organization_id', selectedOrganizationId),
                supabase.from('customers').select('id, name, total_transactions').eq('organization_id', selectedOrganizationId),
                supabase.from('promotions').select('id, name, type, value, get_product_id').eq('organization_id', selectedOrganizationId).eq('is_active', true),
                supabase.from('grades').select('value, label').eq('organization_id', selectedOrganizationId),
                supabase.from('aromas').select('value, label, grade').eq('organization_id', selectedOrganizationId),
                supabase.from('bottle_sizes').select('value, label').eq('organization_id', selectedOrganizationId),
                supabase.from('recipes').select('aroma, bottle_size, essence, solvent, price').eq('organization_id', selectedOrganizationId)
            ]);
            setProductCatalog(Array.isArray(productsResult.data) ? productsResult.data as Product[] : []);
            setMembers(Array.isArray(customersResult.data) ? customersResult.data as Customer[] : []);
            setPromotions(Array.isArray(promotionsResult.data) ? promotionsResult.data as Promotion[] : []);
            setGrades(Array.isArray(gradesResult.data) ? gradesResult.data as { value: string; label: string }[] : []);
            setAromas(Array.isArray(aromasResult.data) ? aromasResult.data as { value: string; label: string; grade: string }[] : []);
            setBottleSizes(Array.isArray(bottleSizesResult.data) ? bottleSizesResult.data as { value: number; label: string }[] : []);
            if (Array.isArray(recipesResult.data)) {
                const recipesObj: Record<string, Record<number, any>> = {};
                for (const r of recipesResult.data) {
                    if (!recipesObj[r.aroma]) recipesObj[r.aroma] = {};
                    recipesObj[r.aroma][r.bottle_size] = { essence: r.essence, solvent: r.solvent, price: r.price };
                }
                setRecipes(recipesObj);
            } else {
                setRecipes({});
            }
            // Consolidated error handling
            const errors = [productsResult.error, customersResult.error, promotionsResult.error, gradesResult.error, aromasResult.error, bottleSizesResult.error, recipesResult.error].filter(Boolean);
            if(errors.length > 0) {
                toast({ variant: "destructive", title: "Error Memuat Data", description: `Gagal memuat beberapa data penting untuk POS. ${errors.map(e => e?.message).join(', ')}` });
            }
            setIsLoadingData(false);
        };
        fetchPosData();
    }, [selectedOrganizationId, toast]);

    const memberOptions = useMemo(() => members.map(m => ({ value: m.id, label: m.name })), [members]);
    
    const handleSetPromo = (promoId: string) => {
        const promo = promotions.find(p => p.id === promoId);
        setAppliedPromo(promo || null);
    };

    const handleSetCustomer = (customerId: string) => {
        const customer = members.find(m => m.id === customerId);
        setActiveCustomer(customer || null);
        setShowLoyaltyReward(customer ? customer.total_transactions >= loyaltySettings.threshold : false);
    };
    
    useEffect(() => {
        const bogoPromoItemInCart = cart.find(item => item.isPromo && item.id.startsWith('promo-bogo-'));
        if (appliedPromo?.type === 'BOGO' && appliedPromo.get_product_id) {
            const freeProduct = productCatalog.find(p => p.id === appliedPromo.get_product_id);
            const hasRegularItem = cart.some(item => !item.isPromo);
            if (freeProduct && hasRegularItem && !bogoPromoItemInCart) {
                setCart(prevCart => [...prevCart, { id: `promo-bogo-${freeProduct.id}`, name: `GRATIS: ${freeProduct.name}`, price: 0, quantity: 1, type: 'product', isPromo: true }]);
            } else if (!hasRegularItem && bogoPromoItemInCart) {
                setCart(prevCart => prevCart.filter(item => item.id !== bogoPromoItemInCart.id));
            }
        } else if (bogoPromoItemInCart) {
            setCart(prevCart => prevCart.filter(item => item.id !== bogoPromoItemInCart.id));
        }
    }, [appliedPromo, cart, productCatalog]);

    const handleClearOrder = () => {
        setCart([]);
        setAppliedPromo(null);
        setActiveCustomer(null);
        setShowLoyaltyReward(false);
        setPaymentMethod('cash');
    };

    const handleCheckout = async () => {
        if (cart.length === 0 || !user) {
            toast({ variant: "destructive", title: "Keranjang Kosong", description: "Tidak bisa checkout dengan keranjang kosong." });
            return;
        }
        setIsCheckingOut(true);

        const transactionData = {
            total_amount: total,
            payment_method: paymentMethod,
            status: 'completed',
            // customer_id: activeCustomer?.id, // Uncomment when customer logic is fully integrated
            items: cart
                .filter(item => item.type === 'product' && !item.isPromo) // Hanya produk reguler
                .map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    price: item.price,
                })),
            // Anda perlu menangani 'refill' items secara terpisah, misalnya dengan membuat produk 'placeholder'
            // atau dengan menyimpan detailnya di kolom JSON pada transaction_items.
        };

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal membuat transaksi.');
            }

            toast({ title: "Transaksi Berhasil!", description: "Pesanan telah berhasil diproses." });
            handleClearOrder(); // Reset state setelah berhasil
        } catch (error: any) {
            toast({ variant: "destructive", title: "Checkout Gagal", description: error.message });
        } finally {
            setIsCheckingOut(false);
        }
    };
    
    // --- Kalkulasi Total ---
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const discount = useMemo(() => {
        if (!appliedPromo || subtotal === 0 || appliedPromo.type === 'BOGO') return 0;
        if (appliedPromo.type === 'Persentase') return subtotal * (appliedPromo.value / 100);
        if (appliedPromo.type === 'Nominal') return Math.min(subtotal, appliedPromo.value);
        return 0;
    }, [appliedPromo, subtotal]);
    const tax = useMemo(() => (subtotal - discount) * 0.11, [subtotal, discount]);
    const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);

    if (authLoading || isLoadingData) return <div className="p-6">Memuat data POS...</div>;

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            <div className="lg:col-span-2 flex flex-col gap-4">
                {/* ... UI lainnya ... */}
                <RefillForm onAddToCart={(item) => setCart(prev => [...prev, item])} grades={grades} aromas={aromas} bottleSizes={bottleSizes} recipes={recipes} />
            </div>
            <div className="lg:col-span-1 flex flex-col gap-4">
                <Card className="flex flex-col h-full">
                    {/* ... UI lainnya ... */}
                    {cart.length > 0 && (
                        <>
                            <CardContent className="p-4 space-y-2 text-sm">
                                {/* ... Detail harga ... */}
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
