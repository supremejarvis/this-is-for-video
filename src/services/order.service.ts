/**
 * Apollo Engineering Order Service
 * Connects frontend checkout to FastAPI backend order management and Razorpay verification.
 */

import { orderApi, CreateOrderPayload, BackendOrderResponse } from './api/orderApi';
import { paymentApi, RazorpayVerifyPayload, RazorpayVerifyResponse, RazorpayOrderResponse } from './api/paymentApi';

export type { CreateOrderPayload, BackendOrderResponse, RazorpayVerifyPayload, RazorpayVerifyResponse };

export class OrderService {
  /**
   * Submit authoritative order to PostgreSQL via FastAPI
   */
  public static async createOrder(payload: CreateOrderPayload): Promise<BackendOrderResponse> {
    return orderApi.createOrder(payload);
  }

  /**
   * Fetch specific order details by ID or order number
   */
  public static async getOrder(orderIdOrNumber: string): Promise<BackendOrderResponse> {
    return orderApi.getOrder(orderIdOrNumber);
  }

  /**
   * Fetch user's order history
   */
  public static async getMyOrders(): Promise<BackendOrderResponse[]> {
    return orderApi.listOrders();
  }

  /**
   * Initialize Razorpay payment order
   */
  public static async createRazorpayOrder(orderId: string): Promise<RazorpayOrderResponse> {
    return paymentApi.createRazorpayOrder(orderId);
  }

  /**
   * Dual-stage cryptographic signature verification for Razorpay
   */
  public static async verifyPayment(payload: RazorpayVerifyPayload): Promise<RazorpayVerifyResponse> {
    return paymentApi.verifyRazorpayPayment(payload);
  }
}

export const orderService = OrderService;
