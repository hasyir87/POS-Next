
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getMaterialSuggestion } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Separator } from "./ui/separator";

interface Material {
  name: string;
  quantity: number;
  unit: string;
}

interface OptimalMixItem {
  material: string;
  quantity: number;
  unit: string;
}

const formSchema = z.object({
  fragranceOrder: z.string().min(10, {
    message: "Harap jelaskan wewangian yang diinginkan minimal 10 karakter.",
  }),
});

export function InventoryTool({ availableMaterials }: { availableMaterials: Material[] }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ optimalMix: OptimalMixItem[], reasoning: string } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fragranceOrder: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setSuggestion(null);

    const materialsString = JSON.stringify(
      availableMaterials.map(({ name, quantity }) => ({ name, quantity }))
    );

    const result = await getMaterialSuggestion({
      fragranceOrder: values.fragranceOrder,
      availableMaterials: materialsString,
    });

    setIsLoading(false);

    if (result.success && result.data) {
      try {
        const parsedMix = JSON.parse(result.data.optimalMix);
        setSuggestion({
            optimalMix: parsedMix,
            reasoning: result.data.reasoning
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Gagal Mem-parsing Saran",
          description: "AI mengembalikan format yang tidak valid. Silakan coba lagi.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Saran AI Gagal",
        description: result.error,
      });
    }
  }

  const handleAddToOrder = () => {
    // In a real app, this would likely trigger a state update in the parent
    // component or a navigation to the POS page with the items pre-filled.
    // For now, we'll just show a confirmation toast.
    if (suggestion) {
      toast({
        title: "Saran Ditambahkan",
        description: "Campuran optimal telah ditambahkan ke pesanan.",
      });
    }
  };


  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          Ahli Racik Cerdas
        </CardTitle>
        <CardDescription>
          Jelaskan profil aroma yang diinginkan pelanggan, dan AI kami akan menyarankan campuran optimal menggunakan bahan yang tersedia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fragranceOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permintaan Wewangian Pelanggan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contoh: 'Aroma ringan dan segar dengan sentuhan jeruk dan dasar kayu, cocok untuk musim panas.'"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Sarankan Campuran
            </Button>
          </form>
        </Form>
        
        {isLoading && (
            <div className="mt-6 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Ahli racik AI kami sedang berpikir...</p>
            </div>
        )}

        {suggestion && (
          <div className="mt-6 space-y-4">
            <Separator />
            <div>
              <h3 className="font-headline text-lg font-semibold">Saran Campuran Optimal</h3>
              <Card className="mt-2">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bahan</TableHead>
                                <TableHead className="text-right">Kuantitas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suggestion.optimalMix.map((item) => (
                                <TableRow key={item.material}>
                                    <TableCell>{item.material}</TableCell>
                                    <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </div>
            <div>
              <h3 className="font-headline text-lg font-semibold">Alasan</h3>
              <p className="mt-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md border">
                {suggestion.reasoning}
              </p>
            </div>
            <Button className="w-full" variant="outline" onClick={handleAddToOrder}>Tambah ke Pesanan</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
