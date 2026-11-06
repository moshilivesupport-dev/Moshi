-- ToS, Age 18+, CinetPay & Payouts enhancements

-- Terms acceptance + stricter age
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

-- Enforce 18+ at DB level for sellers (buyers can be checked at registration)
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age is null or age >= 18);

-- Platform commission settings
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

insert into public.platform_settings (key, value) values
  ('commission_rate', '10'),
  ('cinetpay_fee_percent', '2.5'),
  ('cinetpay_fee_fixed', '0'),
  ('min_payout_xof', '5000'),
  ('terms_version', '"1.0"')
on conflict (key) do nothing;

-- CinetPay transactions log
create table if not exists public.cinetpay_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  order_id uuid references public.orders(id),
  transaction_id text,
  amount numeric(14,2) not null,
  fees numeric(14,2) default 0,
  currency text default 'XOF',
  status text default 'pending' check (status in ('pending', 'accepted', 'refused', 'cancelled')),
  payment_method text,
  raw_response jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enhance withdrawals for admin payout management
alter table public.withdrawals
  add column if not exists admin_note text,
  add column if not exists processed_by uuid references public.profiles(id),
  add column if not exists cinetpay_payout_id text;

create index if not exists idx_withdrawals_status on public.withdrawals(status);
