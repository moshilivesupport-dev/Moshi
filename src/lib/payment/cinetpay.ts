/**
 * CinetPay fee & total calculation
 *
 * Rule: CinetPay transaction fees are added to the amount paid by the customer.
 * The seller receives the exact product price.
 * Platform commission is deducted later from the seller's payouts.
 */

export interface CinetPayFeeConfig {
  percent: number; // e.g. 2.5
  fixed: number;   // e.g. 0
}

export interface CheckoutBreakdown {
  productPrice: number;      // What the seller should receive
  cinetpayFees: number;      // Fees paid by the customer
  customerTotal: number;     // productPrice + cinetpayFees
  platformCommission: number; // Deducted later from seller payout
  sellerNet: number;         // productPrice - platformCommission (at payout time)
  currency: string;
}

const DEFAULT_CINETPAY_FEE: CinetPayFeeConfig = {
  percent: 2.5,
  fixed: 0,
};

const DEFAULT_COMMISSION_RATE = 10; // %

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
  const cinetpayFees = calculateCinetPayFees(productPrice, cinetpayConfig);
  const customerTotal = productPrice + cinetpayFees;
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

/**
 * Stub: initiate CinetPay payment
 * In production: call CinetPay API (https://docs.cinetpay.com)
 */
export async function initiateCinetPayPayment(params: {
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  transactionId: string;
  notifyUrl: string;
  returnUrl: string;
}): Promise<{ paymentUrl?: string; error?: string }> {
  // TODO: Replace with real CinetPay API call
  // POST https://api-checkout.cinetpay.com/v2/payment
  console.log("[CinetPay stub] initiate payment", params);
  return {
    paymentUrl: `/payments/cinetpay/mock?tx=${params.transactionId}&amount=${params.amount}`,
  };
}
