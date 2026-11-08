/**
 * Calcul des frais et du total CinetPay (utilisable côté client ET serveur).
 *
 * Règle : les frais CinetPay sont AJOUTÉS au montant payé par le client.
 * Le vendeur reçoit le prix exact du produit. La commission plateforme est
 * prélevée plus tard, lors des payouts vendeur.
 *
 * Contrainte CinetPay : le montant d'une transaction doit être un entier
 * multiple de 5. L'arrondi est donc absorbé par les frais.
 *
 * Les appels à l'API CinetPay (clés secrètes) sont dans cinetpay-server.ts.
 */

export interface CinetPayFeeConfig {
  percent: number; // ex. 2.5
  fixed: number;   // ex. 0
}

export interface CheckoutBreakdown {
  productPrice: number;       // ce que le vendeur doit recevoir
  cinetpayFees: number;       // frais payés par le client (arrondi inclus)
  customerTotal: number;      // montant débité au client (multiple de 5)
  platformCommission: number; // prélevée plus tard sur le payout vendeur
  sellerNet: number;          // productPrice - platformCommission
  currency: string;
}

const DEFAULT_CINETPAY_FEE: CinetPayFeeConfig = { percent: 2.5, fixed: 0 };
const DEFAULT_COMMISSION_RATE = 10; // %
const AMOUNT_STEP = 5;

export function calculateCinetPayFees(
  amount: number,
  config: CinetPayFeeConfig = DEFAULT_CINETPAY_FEE
): number {
  return Math.ceil((amount * config.percent) / 100 + config.fixed);
}

export function buildCheckoutBreakdown(
  productPrice: number,
  currency: string = "XOF",
  cinetpayConfig: CinetPayFeeConfig = DEFAULT_CINETPAY_FEE,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): CheckoutBreakdown {
  const rawFees = calculateCinetPayFees(productPrice, cinetpayConfig);
  const customerTotal = Math.ceil((productPrice + rawFees) / AMOUNT_STEP) * AMOUNT_STEP;
  const cinetpayFees = customerTotal - productPrice;
  const platformCommission = Math.round((productPrice * commissionRate) / 100);
  const sellerNet = productPrice - platformCommission;

  return {
    productPrice,
    cinetpayFees,
    customerTotal,
    platformCommission,
    sellerNet,
    currency,
  };
}
