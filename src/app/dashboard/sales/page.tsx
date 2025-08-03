
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Tag, Trash2 } from "lucide-react";
import Image from 'next/image';

const products = [
  { name: "Ocean Breeze", price: 79.99, image: "https://placehold.co/300x200", hint: "ocean wave" },
  { name: "Mystic Woods", price: 65.50, image: "https://placehold.co/300x200", hint: "forest path" },
  { name: "Floral Fantasy", price: 72.00, image: "https://placehold.co/300x200", hint: "flower garden" },
  { name: "Citrus Grove", price: 55.00, image: "https://placehold.co/300x200", hint: "orange tree" },
  { name: "Spiced Amber", price: 85.25, image: "https://placehold.co/300x200", hint: "amber spice" },
  { name: "Vanilla Dream", price: 68.75, image: "https://placehold.co/300x200", hint: "vanilla bean" },
];

interface OrderItem {
    name: string;
    price: number;
    quantity: number;
}

export default function SalesPage() {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    const addToOrder = (product: { name: string; price: number }) => {
        setOrderItems(prevItems => {
            const existingItem = prevItems.find(item => item.name === product.name);
            if (existingItem) {
                return prevItems.map(item =>
                    item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...product, quantity: 1 }];
        });
    };

    const removeFromOrder = (productName: string) => {
        setOrderItems(prevItems => prevItems.filter(item => item.name !== productName));
    }

    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;


  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Select products to add to the order.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.name} className="overflow-hidden">
                  <CardContent className="p-0">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={300}
                      height={200}
                      className="object-cover w-full h-32"
                      data-ai-hint={product.hint}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col items-start p-4 bg-card">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">${product.price.toFixed(2)}</p>
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => addToOrder(product)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add to Order
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              <Card className="flex flex-col items-center justify-center text-center p-4 border-dashed">
                <CardHeader>
                  <CardTitle className="font-headline">Custom Fragrance</CardTitle>
                  <CardDescription>Create a unique blend for the customer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => addToOrder({name: 'Custom Blend', price: 95.00})}>Create Custom Blend</Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card className="sticky top-20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Current Order</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3">
              {orderItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No items in order.</p>
              ) : (
                orderItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                    <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <p>${(item.price * item.quantity).toFixed(2)}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromOrder(item.name)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                           <span className="sr-only">Remove item</span>
                        </Button>
                    </div>
                    </div>
                ))
              )}
            </div>
            {orderItems.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-2">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tax</span>
                        <span>${tax.toFixed(2)}</span>
                    </div>
                    <Button variant="link" size="sm" className="p-0 h-auto text-primary">
                        <Tag className="mr-2 h-4 w-4" />
                        Apply Promotion
                    </Button>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    </div>
                </>
            )}
          </CardContent>
          {orderItems.length > 0 && (
            <CardFooter>
              <Button className="w-full">Complete Sale</Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
