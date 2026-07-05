-- ============================================================
-- Exhibition 2569 — Finance / Stock / Purchase management system
-- Run this whole file once in Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- 1. PROFILES ---------------------------------------------------
-- Extends Supabase auth.users with app-specific fields.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text,
  full_name text not null,
  team text,               -- e.g. 'Creative', 'Graphic Design'
  position text,           -- 'Head' / 'Member'
  role text not null default 'member' check (role in ('admin','member')), -- admin = approver
  created_at timestamptz default now()
);

-- Automatically create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'member');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. FUNDS (3 pots of money) -------------------------------------
create table if not exists funds (
  id serial primary key,
  name text not null,          -- 'งบหลัก', 'งบสำรอง', 'ค่าน้ำมัน'
  budget numeric not null default 0
);

insert into funds (name, budget) values
  ('งบหลัก', 15000),
  ('งบสำรอง', 3381),
  ('ค่าน้ำมัน', 1000)
on conflict do nothing;

-- 3. TRANSACTIONS (finance ledger) --------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  fund_id int references funds(id) not null,
  tx_code text,
  item text not null,
  type text not null check (type in ('รายรับ','รายจ่าย')),
  category text,
  department text,
  amount numeric not null default 0,
  payment_method text,
  requested_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  status text not null default 'รออนุมัติ' check (status in ('รออนุมัติ','ผ่าน','ไม่ผ่าน')),
  evidence_url text,
  note text,
  created_at timestamptz default now()
);

-- 4. STOCK ITEMS ----------------------------------------------------
create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,       -- ค่าพร็อบ / ค่าอาหาร / เครื่องดื่ม / ขนม
  unit text default 'ชิ้น',
  quantity numeric not null default 0,
  low_stock_threshold numeric default 5,
  updated_at timestamptz default now()
);

-- 5. STOCK LOGS (withdrawals / additions) ---------------------------
create table if not exists stock_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references stock_items(id) not null,
  change_qty numeric not null,  -- negative = withdrawn, positive = added
  department text,
  requested_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  status text not null default 'รออนุมัติ' check (status in ('รออนุมัติ','ผ่าน','ไม่ผ่าน')),
  note text,
  created_at timestamptz default now()
);

-- 6. PURCHASES ---------------------------------------------------------
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  category text,
  department text,
  unit_price numeric not null default 0,
  quantity numeric not null default 1,
  fund_id int references funds(id),
  payment_method text,
  requested_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  status text not null default 'รออนุมัติ' check (status in ('รออนุมัติ','ผ่าน','ไม่ผ่าน')),
  evidence_url text,
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table funds enable row level security;
alter table transactions enable row level security;
alter table stock_items enable row level security;
alter table stock_logs enable row level security;
alter table purchases enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- Everyone logged in can read everything (small trusted team)
create policy "read all - profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "read all - funds" on funds for select using (auth.role() = 'authenticated');
create policy "read all - transactions" on transactions for select using (auth.role() = 'authenticated');
create policy "read all - stock_items" on stock_items for select using (auth.role() = 'authenticated');
create policy "read all - stock_logs" on stock_logs for select using (auth.role() = 'authenticated');
create policy "read all - purchases" on purchases for select using (auth.role() = 'authenticated');

-- Any authenticated user can create a request for themselves
create policy "insert own - transactions" on transactions for insert with check (auth.uid() = requested_by);
create policy "insert own - stock_logs" on stock_logs for insert with check (auth.uid() = requested_by);
create policy "insert own - purchases" on purchases for insert with check (auth.uid() = requested_by);

-- Only admins can update status (approve/reject) or edit records
create policy "admin update - transactions" on transactions for update using (is_admin());
create policy "admin update - stock_logs" on stock_logs for update using (is_admin());
create policy "admin update - purchases" on purchases for update using (is_admin());
create policy "admin update - stock_items" on stock_items for update using (is_admin());
create policy "admin insert - stock_items" on stock_items for insert with check (is_admin());
create policy "admin manage - funds" on funds for update using (is_admin());
create policy "admin manage - profiles" on profiles for update using (is_admin() or auth.uid() = id);

-- Realtime: allow these tables to broadcast changes
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table stock_items;
alter publication supabase_realtime add table stock_logs;
alter publication supabase_realtime add table purchases;
