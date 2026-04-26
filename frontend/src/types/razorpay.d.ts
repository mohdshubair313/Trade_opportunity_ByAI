export {};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }

  interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    image?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
      backdrop_color?: string;
      hide_topbar?: boolean;
    };
    modal?: {
      ondismiss?: () => void;
      confirm_close?: boolean;
      escape?: boolean;
      animation?: boolean;
    };
    handler?: (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => void;
  }

  interface RazorpayCheckoutInstance {
    open(): void;
    close(): void;
    on(event: string, callback: (response: unknown) => void): void;
  }
}
