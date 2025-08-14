
"use client";
import React from "react";

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({
    message: "Harap masukkan alamat email yang valid.",
  }),
  password: z.string().min(6, {
    message: "Kata sandi harus minimal 6 karakter.",
  }),
})

export function LoginForm() {
  const { login } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    setIsLoading(true);
    
    try {
      await login({ email: values.email, password: values.password });
      // Middleware akan menangani redirect on success
    } catch (error: any) {
      let msg = "Login gagal. Silakan coba lagi.";
      if (error?.message?.toLowerCase().includes("invalid login credentials")) {
        msg = "Email atau password salah.";
      }
      setLoginError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="nama@contoh.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kata Sandi</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
