-- seed-data.sql

-- Clear existing data to prevent conflicts, starting from tables with foreign keys.
-- Note: This is for development and will delete all data in these tables.
TRUNCATE TABLE transaction_items, transactions, recipes, promotions, raw_materials, products, categories, grades, aromas, bottle_sizes, customers RESTART IDENTITY CASCADE;

-- Get the ID of the parent organization (assuming there's only one for this seed)
-- We need to do this in a variable because we can't use subqueries in INSERTs across different tables easily.
-- This part is tricky in pure SQL for Supabase RPC, so we will assume an org exists.
-- The signup process should create the first organization. For seeding, let's find the first one.
-- In a real script, you might pass this ID as a parameter. For now, we'll try to find it.

-- Let's declare a variable to hold the organization ID
DO $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Find the first parent organization to use for seeding
    SELECT id INTO v_org_id FROM organizations WHERE parent_organization_id IS NULL LIMIT 1;

    -- If no organization is found, we cannot proceed with seeding.
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'No parent organization found. Please create an owner account first.';
    END IF;

    -- Seed Categories
    INSERT INTO categories (organization_id, name) VALUES
    (v_org_id, 'Bibit Parfum'),
    (v_org_id, 'Pelarut'),
    (v_org_id, 'Bahan Sintetis'),
    (v_org_id, 'Kemasan');

    -- Seed Raw Materials (Inventory)
    INSERT INTO raw_materials (organization_id, name, brand, quantity, unit, category, purchase_price) VALUES
    (v_org_id, 'Rose Absolute', 'Luxe Fragrance Co.', 50, 'ml', 'Bibit Parfum', 1500),
    (v_org_id, 'Jasmine Sambac', 'Aroma Natural', 350, 'ml', 'Bibit Parfum', 1800),
    (v_org_id, 'Bergamot Oil', 'Aroma Natural', 1200, 'ml', 'Bibit Parfum', 800),
    (v_org_id, 'Sandalwood', 'Luxe Fragrance Co.', 0, 'g', 'Bibit Parfum', 2500),
    (v_org_id, 'Vanilla Extract', 'Aroma Natural', 800, 'ml', 'Bibit Parfum', 950),
    (v_org_id, 'Ethanol (Perfumer''s Alcohol)', 'Generic Chemical', 5000, 'ml', 'Pelarut', 100),
    (v_org_id, 'Iso E Super', 'SynthScents', 180, 'ml', 'Bahan Sintetis', 400),
    (v_org_id, 'Ambroxan', 'SynthScents', 150, 'g', 'Bahan Sintetis', 3000),
    (v_org_id, 'Botol Kaca 50ml', 'GlassPack', 150, 'pcs', 'Kemasan', 3500),
    (v_org_id, 'Botol Kaca 100ml', 'GlassPack', 80, 'pcs', 'Kemasan', 5000);

    -- Seed Products
    INSERT INTO products (organization_id, name, price, stock, image_url, description) VALUES
    (v_org_id, 'Ocean Breeze', 79990, 15, 'https://placehold.co/150x150.png', 'A fresh and invigorating scent.'),
    (v_org_id, 'Mystic Woods', 85000, 10, 'https://placehold.co/150x150.png', 'A deep and earthy aroma.'),
    (v_org_id, 'Citrus Grove', 75500, 20, 'https://placehold.co/150x150.png', 'A zesty and vibrant fragrance.'),
    (v_org_id, 'Floral Fantasy', 92000, 8, 'https://placehold.co/150x150.png', 'A bouquet of exotic flowers.'),
    (v_org_id, 'Parfum Mini', 25000, 50, 'https://placehold.co/150x150.png', 'A small bottle of our most popular scent.');

    -- Seed Customers (Members)
    INSERT INTO customers (organization_id, name, email, phone, transaction_count, loyalty_points) VALUES
    (v_org_id, 'Andi Wijaya', 'andi.w@example.com', '081234567890', 25, 250),
    (v_org_id, 'Bunga Citra', 'bunga.c@example.com', '082345678901', 9, 90),
    (v_org_id, 'Charlie Dharmawan', 'charlie.d@example.com', '083456789012', 4, 40);

    -- Seed Promotions
    -- Note: For BOGO, we need the ID of 'Parfum Mini'. Let's find it.
    DECLARE
        v_parfum_mini_id UUID;
    BEGIN
        SELECT id INTO v_parfum_mini_id FROM products WHERE name = 'Parfum Mini' AND organization_id = v_org_id;

        INSERT INTO promotions (organization_id, name, type, value, get_product_id, is_active) VALUES
        (v_org_id, 'Diskon Akhir Pekan', 'Persentase', 15, NULL, true),
        (v_org_id, 'Potongan Langsung', 'Nominal', 20000, NULL, true),
        (v_org_id, 'Beli 1 Gratis 1 Parfum Mini', 'BOGO', 1, v_parfum_mini_id, true);
    END;

    -- Seed Grades for Refills
    INSERT INTO grades (organization_id, name, price_multiplier) VALUES
    (v_org_id, 'Standar', 1.0),
    (v_org_id, 'Premium', 1.5);

    -- Seed Aromas for Refills
    INSERT INTO aromas (organization_id, name, category, description) VALUES
    (v_org_id, 'Sandalwood Supreme', 'Woody', 'A rich, creamy sandalwood scent.'),
    (v_org_id, 'Vanilla Orchid', 'Gourmand', 'A sweet and comforting vanilla aroma.'),
    (v_org_id, 'YSL Black Opium', 'Oriental', 'Inspired by the popular fragrance.'),
    (v_org_id, 'Baccarat Rouge', 'Oriental', 'Inspired by the popular fragrance.'),
    (v_org_id, 'Aqua di Gio', 'Aquatic', 'Inspired by the popular fragrance.'),
    (v_org_id, 'Creed Aventus', 'Fruity', 'Inspired by the popular fragrance.');

    -- Seed Bottle Sizes for Refills
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_org_id, 30, 'ml', 10000),
    (v_org_id, 50, 'ml', 15000),
    (v_org_id, 100, 'ml', 20000);

    -- Seed Recipes
    -- This requires getting IDs of grades, aromas, and bottle_sizes. This is complex for a single script.
    -- For simplicity, we will omit recipes for now as they require more complex logic to link correctly.
    -- A more advanced seeding script in JS/TS would be better for this.

END $$;
