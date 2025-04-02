/*
  # Create inventory_transactions table

  1. New Tables
    - `inventory_transactions`
      - `id` (uuid, primary key)
      - `item_id` (uuid, foreign key to items)
      - `type` (text: 'in', 'out', 'adjustment')
      - `quantity` (integer)
      - `location_id` (uuid, foreign key to locations)
      - `project_id` (uuid, foreign key to projects)
      - `user_id` (uuid, foreign key to users)
      - `date` (timestamp)
      - `notes` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `inventory_transactions` table
    - Add policy for authenticated users to read transactions
    - Add policy for authenticated users to create transactions
    - Add policy for admins to update/delete transactions
*/

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read transactions"
  ON inventory_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create transactions"
  ON inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update transactions"
  ON inventory_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete transactions"
  ON inventory_transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
