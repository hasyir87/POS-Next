
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const expenseHistory = [
    { id: "EXP001", date: "2023-10-25", category: "Utilities", description: "Monthly electricity bill", amount: "$120.50" },
    { id: "EXP002", date: "2023-10-20", category: "Rent", description: "Store rental for November", amount: "$1500.00" },
    { id: "EXP003", date: "2023-10-18", category: "Supplies", description: "Cleaning supplies", amount: "$45.20" },
    { id: "EXP004", date: "2023-10-15", category: "Payroll", description: "Salary for Alice (Oct 1-15)", amount: "$800.00" },
    { id: "EXP005", date: "2023-10-12", category: "Marketing", description: "Social media ad campaign", amount: "$250.00" },
];

export default function ExpensesPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Expense Management</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline">Add New Expense</DialogTitle>
                            <DialogDescription>
                                Record a new business expense.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">Date</Label>
                                <Input id="date" type="date" className="col-span-3" defaultValue={new Date().toISOString().substring(0, 10)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                <Select>
                                    <SelectTrigger id="category" className="col-span-3">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rent">Rent</SelectItem>
                                        <SelectItem value="payroll">Payroll</SelectItem>
                                        <SelectItem value="utilities">Utilities</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                        <SelectItem value="supplies">Supplies</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Amount</Label>
                                <Input id="amount" type="number" placeholder="$0.00" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Input id="description" placeholder="e.g., Monthly electricity bill" className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Expense</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Expense History</CardTitle>
                    <CardDescription>A log of all recorded business expenses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenseHistory.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>
                                        <div className="font-medium">{expense.date}</div>
                                        <div className="text-sm text-muted-foreground">{expense.id}</div>
                                    </TableCell>
                                    <TableCell>{expense.category}</TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell className="text-right">{expense.amount}</TableCell>
                                    <TableCell>
                                       <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
