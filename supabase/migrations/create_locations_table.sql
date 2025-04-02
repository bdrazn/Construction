/*
  # Create locations table

  1. New Tables
    - `locations`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `address` (text)
      - `type` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `locations` table
    - Add policy for authenticated users to read locations
    - Add policy for admins to manage locations
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  address text,
  type text NOT NULL DEFAULT 'warehouse',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read locations"
  ON locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert locations"
  ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update locations"
  ON locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete locations"
  ON locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
