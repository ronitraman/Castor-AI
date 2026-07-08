import { google } from '@ai-sdk/google';
import { isStepCount, streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-pro-latest'),
    // Let the SDK handle the message typing internally
    messages,
    stopWhen: isStepCount(5),
    system: `You are OmniResolve, an autonomous L3 customer resolution agent for a high-end tech hardware brand. 
    You do not just answer questions; you execute workflows. 
    Be concise, highly professional, and strictly action-oriented. 
    If a user asks about an order, ALWAYS use the checkOrderStatus tool.
    If a user is angry about a delayed order, offer a refund using the initiateRefund tool.`,
    tools: {
      checkOrderStatus: tool({
        description: 'Query the database for the live shipping status of an order.',
        inputSchema: z.object({
          orderId: z.string().describe('The unique order ID provided by the user.'),
        }),
        // Zod infers the type seamlessly
        execute: async ({ orderId }) => {
          await new Promise(resolve => setTimeout(resolve, 1200)); 
          
          if (orderId.includes('DELAY')) {
             return { status: 'Exception', location: 'Memphis Hub', delayReason: 'Weather routing', estDelivery: 'Unknown' };
          }
          return { status: 'In Transit', location: 'Local Distribution Facility', estDelivery: 'Tomorrow by 8 PM' };
        },
      }),

      initiateRefund: tool({
        description: 'Process a full refund to the original payment method for a delayed or canceled order.',
        inputSchema: z.object({
          orderId: z.string().describe('The order ID to refund.'),
          reason: z.string().describe('The reason for the refund.'),
        }),
        // Zod infers the types seamlessly
        execute: async ({ orderId, reason }) => {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return { 
            success: true, 
            refundAmount: 249.99, 
            currency: 'USD', 
            status: 'Processed to Original Payment Method',
            receiptId: `REF-${Math.floor(Math.random() * 100000)}` 
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}