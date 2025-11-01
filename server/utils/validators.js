import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(), // 可选，用于向后兼容
});

export const synthesizeSchema = z.object({
  inputs: z.union([z.array(z.number()), z.array(z.string())]).refine(arr => arr.length >= 2, {
    message: '至少需要2个输入项',
  }),
  name: z.string().min(1).max(100),
  mode: z.enum(['ai', 'rule', 'auto']).default('auto'),
  generateImage: z.boolean().default(false),
  preview: z.boolean().default(false),
});

export const inventoryAddSchema = z.object({
  itemId: z.number(),
  slot: z.number().optional(),
});

export const inventoryRemoveSchema = z.object({
  itemId: z.number(),
});

export const contractChooseSchema = z.object({
  contractId: z.number(),
  choice: z.number(),
});

export const imageGenerateSchema = z.object({
  prompt: z.string().min(1).max(500),
  options: z.object({
    size: z.string().optional(),
    style: z.string().optional(),
    seed: z.string().optional(),
  }).optional(),
});

export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (err) {
      res.status(400).json({
        error: 'Validation failed',
        details: err.errors,
      });
    }
  };
}

