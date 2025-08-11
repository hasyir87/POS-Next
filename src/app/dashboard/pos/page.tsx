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
import { PlusCircle, XCircle } from "lucide-react";
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
    // State dinamis refill
    const [grades, setGrades] = useState<{ value: string; label: string }[]>([]);
    const [aromas, setAromas] = useState<{ value: string; label: string; grade: string }[]>([]);
    const [bottleSizes, setBottleSizes] = useState<{ value: number; label: string }[]>([]);
    const [recipes, setRecipes] = useState<Record<string, Record<number, { essence: number; solvent: number; price: number }>>>({});
    const { toast } = useToast();
    const { selectedOrganizationId, loading: authLoading } = useAuth();

    const [productCatalog, setProductCatalog] = useState<Product[]>([]);
    const [members, setMembers] = useState<Customer[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
    const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
    const [showLoyaltyReward, setShowLoyaltyReward] = useState(false);

    useEffect(() => {
        const fetchPosData = async () => {
            if (!selectedOrganizationId) {
                setProductCatalog([]);
                setMembers([]);
                setPromotions([]);
                setGrades([]);
                setAromas([]);
                setBottleSizes([]);
                setRecipes({});
                setIsLoadingData(false);
                return;
            }
            setIsLoadingData(true);
            const [productsResult, customersResult, promotionsResult, gradesResult, aromasResult, bottleSizesResult, recipesResult] = await Promise.all([
                supabase.from('products').select('id, name, price, image_url, stock').eq('organization_id', selectedOrganizationId),
                supabase.from('customers').select('id, name, total_transactions').eq('organization_id', selectedOrganizationId),
                supabase.from('promos').select('id, name, type, value, get_product_id').eq('organization_id', selectedOrganizationId).eq('is_active', true),
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
            // Transform recipes to nested object: { aroma: { bottleSize: { essence, solvent, price } } }
            if (Array.isArray(recipesResult.data)) {
                const recipesObj: Record<string, Record<number, { essence: number; solvent: number; price: number }>> = {};
                for (const r of recipesResult.data) {
                    if (!recipesObj[r.aroma]) recipesObj[r.aroma] = {};
                    recipesObj[r.aroma][r.bottle_size] = { essence: r.essence, solvent: r.solvent, price: r.price };
                }
                setRecipes(recipesObj);
            } else {
                setRecipes({});
            }
            // Error handling
            if (productsResult.error) toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data produk." });
            if (customersResult.error) toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data pelanggan." });
            if (promotionsResult.error) toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data promosi." });
            if (gradesResult.error) toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data grades." });
            if (aromasResult.error) toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data aromas." });
            if (bottleSizesResult.error) toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data bottle sizes." });
            if (recipesResult.error) toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data recipes." });
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
        if (customer && customer.total_transactions >= loyaltySettings.threshold) {
            setShowLoyaltyReward(true);
        } else {
            setShowLoyaltyReward(false);
        }
    };
    
    // Effect to handle BOGO logic
    useEffect(() => {
        // Hindari infinite loop dengan dependensi cart
        if (!appliedPromo || appliedPromo.type !== 'BOGO' || !appliedPromo.get_product_id) return;
        const freeProduct = productCatalog.find(p => p.id === appliedPromo.get_product_id);
        const hasRegularItem = cart.some(item => !item.isPromo);
        if (freeProduct && hasRegularItem) {
            const promoItemInCart = cart.find(item => item.id === `promo-bogo-${freeProduct.id}`);
            if (!promoItemInCart) {
                setCart(prevCart => [
                    ...prevCart,
                    {
                        id: `promo-bogo-${freeProduct.id}`,
                        name: `GRATIS: ${freeProduct.name}`,
                        price: 0,
                        quantity: 1,
                        type: 'product',
                        isPromo: true
                    }
                ]);
            }
        }
    }, [appliedPromo, productCatalog]);

    // --- STUB FUNGSI EVENT HANDLER ---
    const handleAddToCart = (item: CartItem) => {
        setCart(prev => [...prev, item]);
    };
    const addProductToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.type === 'product');
            if (existing) {
                return prev.map(item => item.id === product.id && item.type === 'product' ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, type: 'product' }];
        });
    };
    const addRefillToCart = (item: CartItem) => {
        setCart(prev => [...prev, item]);
    };
    const updateQuantity = (itemId: string, newQuantity: number) => {
        setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    };
    const handleSaveOrder = () => {
        toast({ title: "Order disimpan (dummy)", description: "Fitur simpan belum diimplementasikan." });
    };
    const handleClearOrder = () => {
        setCart([]);
        setAppliedPromo(null);
        setActiveCustomer(null);
        setShowLoyaltyReward(false);
    };
    const handleCheckout = () => {
        toast({ title: "Checkout (dummy)", description: "Fitur checkout belum diimplementasikan." });
    };
    const handleApplyLoyaltyReward = () => {
        toast({ title: "Loyalty Reward (dummy)", description: "Fitur loyalty reward belum diimplementasikan." });
    };

    // --- PERHITUNGAN TOTAL (URUTAN DIPERBAIKI) ---
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

    const discount = useMemo(() => {
        if (!appliedPromo || subtotal === 0 || appliedPromo.type === 'BOGO') return 0;
        if (appliedPromo.type === 'Persentase') {
            return subtotal * (appliedPromo.value / 100);
        }
        if (appliedPromo.type === 'Nominal') {
            return Math.min(subtotal, appliedPromo.value);
        }
        return 0;
    }, [appliedPromo, subtotal]);

    const tax = useMemo(() => (subtotal - discount) * 0.11, [subtotal, discount]);
    const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);


    if (authLoading || isLoadingData) {
        return <div className="p-6">Loading POS...</div>;
    }

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Product Catalog dan Formulir Isi Ulang */}
                {/* ... Product Catalog UI ... */}
                <RefillForm
                    onAddToCart={handleAddToCart}
                    grades={grades}
                    aromas={aromas}
                    bottleSizes={bottleSizes}
                    recipes={recipes}
                />
            </div>
            <div className="lg:col-span-1 flex flex-col gap-4">
                <Card className="flex flex-col h-full">
                    {/* ... Customer and Cart UI ... */}
                    {cart.length > 0 && (
                        <>
                            {/* ... */}
                            <CardContent className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                                <div className="flex justify-between items-center">
                                    <Select onValueChange={(promoId) => promoId === "" ? setAppliedPromo(null) : handleSetPromo(promoId)} value={appliedPromo?.id || ''}>
                                        <SelectTrigger className="h-auto py-1.5 text-xs w-full">
                                            <SelectValue placeholder="Gunakan Promosi/Voucher" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Tanpa Promosi</SelectItem>
                                            {promotions.map(promo => (
                                                <SelectItem key={promo.id} value={promo.id}>{promo.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     {appliedPromo && (
                                         <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" onClick={() => setAppliedPromo(null)}>
                                             <XCircle className="h-4 w-4 text-muted-foreground" />
                                         </Button>
                                     )}
                                </div>
                                {appliedPromo && appliedPromo.type !== 'BOGO' && (
                                     <div className="flex justify-between items-center text-destructive">
                                        <span>Diskon ({appliedPromo.name})</span>
                                        <span>- {formatCurrency(discount)}</span>
                                     </div>
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
