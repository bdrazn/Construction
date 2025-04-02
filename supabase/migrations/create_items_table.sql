/*
  # Create items table

  1. New Tables
    - `items`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `sku` (text)
      - `category_id` (uuid, foreign key to categories)
      - `current_quantity` (integer)
      - `unit` (text)
      - `reorder_level` (integer)
      - `barcode` (text)
      - `qr_code` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `items` table
    - Add policy for authenticated users to read items
    - Add policy for admins to manage items
*/

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  current_quantity integer NOT NULL DEFAULT 0,
  unit text,
  reorder_level integer NOT NULL DEFAULT 0,
  barcode text,
  qr_code text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read items"
  ON items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert items"
  ON items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update items"
  ON items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete items"
  ON items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
