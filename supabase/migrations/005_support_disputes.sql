-- Support tickets & disputes

create table if not exists public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'purchase', 'transaction', 'payment', 'delivery', 'user_behavior',
    'live', 'account', 'payout', 'other'
  )),
  subject text not null,
  description text not null,
  order_id uuid references public.orders(id),
  stream_id uuid references public.live_streams(id),
  status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  admin_response text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);

alter table public.support_tickets enable row level security;

create policy "Users can create own tickets"
  on public.support_tickets for insert with check (auth.uid() = user_id);

create policy "Users can view own tickets"
  on public.support_tickets for select using (auth.uid() = user_id);

create policy "Admins can manage all tickets"
  on public.support_tickets for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
