

"use client";
import React from "react";

import { useContext } from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MPerfumeAmalLogo } from "./m-perfume-amal-logo"
import { useAuth } from "@/context/auth-context";

const formSchema = z.object({
  email: z.string().email({
    message: "Harap masukkan alamat email yang valid.",
  }),
  password: z.string().min(6, {
    message: "Kata sandi harus minimal 6 karakter.",
  }),
  role: z.enum(["cashier", "admin", "owner"], {
    required_error: "Anda harus memilih peran.",
  }),
})

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const [loginError, setLoginError] = React.useState<string | null>(null);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    try {
      await login({ email: values.email, password: values.password });
      router.push("/dashboard");
    } catch (error: any) {
      let msg = error?.message || "Login gagal";
      if (msg.toLowerCase().includes("invalid login credentials")) {
        msg = "Email atau password salah.";
      } else if (msg.toLowerCase().includes("user not found")) {
        msg = "Akun tidak ditemukan.";
      }
      setLoginError(msg);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <MPerfumeAmalLogo className="w-16 h-16 mb-2 text-primary" />
        <CardTitle className="font-headline text-3xl">M Perfume Amal</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peran</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih peran Anda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cashier">Kasir</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Pemilik</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Masuk</Button>
            {loginError && (
              <div className="text-red-500 text-sm mt-2 text-center">{loginError}</div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
