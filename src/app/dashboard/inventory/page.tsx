import { InventoryTool } from "@/components/inventory-tool";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const availableMaterials = [
  { name: "Rose Absolute", quantity: 500, unit: "ml" },
  { name: "Jasmine Sambac", quantity: 350, unit: "ml" },
  { name: "Bergamot Oil", quantity: 1200, unit: "ml" },
  { name: "Sandalwood", quantity: 200, unit: "g" },
  { name: "Vanilla Extract", quantity: 800, unit: "ml" },
  { name: "Ethanol (Perfumer's Alcohol)", quantity: 5000, unit: "ml" },
  { name: "Iso E Super", quantity: 2500, unit: "ml" },
  { name: "Ambroxan", quantity: 150, unit: "g" },
];

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold">Inventaris</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>Inventaris Langsung</CardTitle>
                    <CardDescription>Tingkat stok bahan baku saat ini.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bahan</TableHead>
                                <TableHead className="text-right">Kuantitas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {availableMaterials.map((material) => (
                                <TableRow key={material.name}>
                                    <TableCell>{material.name}</TableCell>
                                    <TableCell className="text-right">{material.quantity} {material.unit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-4">
          <InventoryTool availableMaterials={availableMaterials} />
        </div>
      </div>
    </div>
  );
}
