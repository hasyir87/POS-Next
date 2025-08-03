import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, User, Languages, Key } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold">Settings</h1>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Key Management</CardTitle>
                        <CardDescription>Create and manage API keys for external applications like your Flutter POS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="flex justify-end">
                             <Button>Generate New Key</Button>
                         </div>
                         <Separator className="my-4" />
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Label</TableHead>
                                     <TableHead>Key (First 8 Chars)</TableHead>
                                     <TableHead>Created</TableHead>
                                     <TableHead className="w-[100px] text-right">Actions</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 <TableRow>
                                     <TableCell className="font-medium">Flutter POS App</TableCell>
                                     <TableCell className="font-mono">sk_live_Abc123De...</TableCell>
                                     <TableCell>October 29, 2023</TableCell>
                                     <TableCell className="text-right">
                                         <Button variant="destructive" size="sm">Revoke</Button>
                                     </TableCell>
                                 </TableRow>
                             </TableBody>
                         </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Promotions</CardTitle>
                        <CardDescription>Manage discounts and special offers like 'Buy One Get One' or bulk pricing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>Create New Promotion</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> User Management</CardTitle>
                        <CardDescription>Manage staff accounts and their roles (Cashier, Admin, Owner).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                         <Button>Add New User</Button>
                         <Button variant="outline" asChild>
                            <Link href="/dashboard/settings/roles">Manage Roles</Link>
                         </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5" /> Language & Region</CardTitle>
                        <CardDescription>Set the application language and currency.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="language">Language</Label>
                            <Select defaultValue="en">
                                <SelectTrigger id="language">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="id">Indonesian</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
