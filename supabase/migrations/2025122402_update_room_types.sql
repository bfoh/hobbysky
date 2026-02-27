-- Update Room Types Configuration
-- This migration ensures all 5 room types exist with correct capacities

-- Add Standard Room if it doesn't exist
INSERT INTO room_types (id, name, description, base_price, max_occupancy, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Standard Room',
    'Comfortable and affordable, perfect for budget travelers',
    360,
    2,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM room_types WHERE name = 'Standard Room'
);

-- Add Executive Suite if it doesn't exist
INSERT INTO room_types (id, name, description, base_price, max_occupancy, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Executive Suite',
    'Premium accommodation with extra space and luxury features',
    460,
    2,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM room_types WHERE name = 'Executive Suite'
);

-- Add Deluxe Room if it doesn't exist
INSERT INTO room_types (id, name, description, base_price, max_occupancy, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Deluxe Room',
    'More spacious with upgraded amenities',
    560,
    2,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM room_types WHERE name = 'Deluxe Room'
);

-- Add Family Room if it doesn't exist
INSERT INTO room_types (id, name, description, base_price, max_occupancy, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Family Room',
    'Ideal for families, accommodates more guests',
    650,
    4,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM room_types WHERE name = 'Family Room'
);

-- Add Presidential Suite if it doesn't exist
INSERT INTO room_types (id, name, description, base_price, max_occupancy, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Presidential Suite',
    'Our most luxurious accommodation with exclusive amenities and premium services',
    1200,
    5,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM room_types WHERE name = 'Presidential Suite'
);

-- Update capacities for any existing room types that have wrong values
UPDATE room_types SET max_occupancy = 2, updated_at = NOW() WHERE name = 'Standard Room' AND (max_occupancy IS NULL OR max_occupancy != 2);
UPDATE room_types SET max_occupancy = 2, updated_at = NOW() WHERE name = 'Executive Suite' AND (max_occupancy IS NULL OR max_occupancy != 2);
UPDATE room_types SET max_occupancy = 2, updated_at = NOW() WHERE name = 'Deluxe Room' AND (max_occupancy IS NULL OR max_occupancy != 2);
UPDATE room_types SET max_occupancy = 4, updated_at = NOW() WHERE name = 'Family Room' AND (max_occupancy IS NULL OR max_occupancy != 4);
UPDATE room_types SET max_occupancy = 5, updated_at = NOW() WHERE name = 'Presidential Suite' AND (max_occupancy IS NULL OR max_occupancy != 5);
