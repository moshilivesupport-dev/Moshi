-- =====================================================================
-- Migration 007 : confirmation de paiement (CinetPay)
-- À exécuter dans le SQL Editor de Supabase, après 001 → 005 (006 conseillée).
-- Idempotente.
-- =====================================================================

-- Un identifiant de transaction ne doit exister qu'une fois
create unique index if not exists ux_cinetpay_transactions_transaction_id
  on public.cinetpay_transactions (transaction_id);

-- Confirme un paiement de façon ATOMIQUE et IDEMPOTENTE :
--  * verrouille la transaction (pas de double traitement si CinetPay renotifie)
--  * refuse si le montant ou la devise vérifiés chez CinetPay diffèrent de la base
--  * passe la commande en "paid" (escrow "held") et décrémente le stock
create or replace function public.confirm_order_payment(
  p_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_payment_method text,
  p_raw jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  tx  public.cinetpay_transactions%rowtype;
  ord public.orders%rowtype;
begin
  select * into tx
  from public.cinetpay_transactions
  where transaction_id = p_transaction_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if tx.status = 'accepted' then
    return 'already_accepted';
  end if;

  if p_amount is null
     or p_currency is null
     or tx.amount <> p_amount
     or coalesce(tx.currency, 'XOF') <> p_currency then
    return 'mismatch';
  end if;

  update public.cinetpay_transactions
  set status = 'accepted',
      payment_method = p_payment_method,
      raw_response = p_raw,
      updated_at = now()
  where id = tx.id;

  if tx.order_id is not null then
    select * into ord from public.orders where id = tx.order_id for update;

    if found and ord.status = 'pending' then
      update public.orders
      set status = 'paid', updated_at = now()
      where id = ord.id;

      -- Pas d'erreur si le stock est insuffisant (paiement déjà encaissé) :
      -- le stock tombe à 0 et l'admin traite la sur-vente.
      update public.products
      set stock = greatest(stock - ord.quantity, 0), updated_at = now()
      where id = ord.product_id;
    end if;
  end if;

  return 'accepted';
end;
$$;

-- Cette fonction contourne la RLS : seul le serveur (service_role) peut l'appeler.
revoke all on function public.confirm_order_payment(text, numeric, text, text, jsonb) from public;
revoke all on function public.confirm_order_payment(text, numeric, text, text, jsonb) from anon, authenticated;
grant execute on function public.confirm_order_payment(text, numeric, text, text, jsonb) to service_role;
