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
    message: "Please describe the desired fragrance in at least 10 characters.",
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
          title: "Error Parsing Suggestion",
          description: "The AI returned an invalid format. Please try again.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "AI Suggestion Failed",
        description: result.error,
      });
    }
  }

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          Intelligent Mixologist
        </CardTitle>
        <CardDescription>
          Describe the customer's desired scent profile, and our AI will suggest an optimal blend using available materials.
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
                  <FormLabel>Customer's Fragrance Request</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'A light, fresh scent with hints of citrus and a woody base, suitable for summer.'"
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
              Suggest Mix
            </Button>
          </form>
        </Form>
        
        {isLoading && (
            <div className="mt-6 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Our AI mixologist is thinking...</p>
            </div>
        )}

        {suggestion && (
          <div className="mt-6 space-y-4">
            <Separator />
            <div>
              <h3 className="font-headline text-lg font-semibold">Suggested Optimal Mix</h3>
              <Card className="mt-2">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
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
              <h3 className="font-headline text-lg font-semibold">Reasoning</h3>
              <p className="mt-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md border">
                {suggestion.reasoning}
              </p>
            </div>
            <Button className="w-full" variant="outline">Add to Order</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
