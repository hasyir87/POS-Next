
-- Buat tabel promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Persentase', 'Nominal', 'BOGO')),
    value NUMERIC NOT NULL,
    get_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buat index untuk performa yang lebih baik
CREATE INDEX idx_promotions_organization_id ON promotions(organization_id);
CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_type ON promotions(type);

-- Buat trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON promotions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Tambahkan Row Level Security (RLS)
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Policy untuk SELECT: User hanya bisa melihat promosi dari organisasi mereka
CREATE POLICY "Users can view promotions from their organization" ON promotions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy untuk INSERT: Owner dan admin bisa membuat promosi
CREATE POLICY "Owners and admins can create promotions" ON promotions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Policy untuk UPDATE: Owner dan admin bisa mengupdate promosi
CREATE POLICY "Owners and admins can update promotions" ON promotions
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Policy untuk DELETE: Owner dan admin bisa menghapus promosi
CREATE POLICY "Owners and admins can delete promotions" ON promotions
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Insert beberapa data contoh untuk testing
INSERT INTO promotions (organization_id, name, type, value, is_active) VALUES 
((SELECT id FROM organizations LIMIT 1), 'Diskon Weekend', 'Persentase', 15, true),
((SELECT id FROM organizations LIMIT 1), 'Potongan Langsung', 'Nominal', 20000, true),
((SELECT id FROM organizations LIMIT 1), 'Buy One Get One', 'BOGO', 1, false);
