import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short").max(80),
  ownerName: z.string().trim().min(2, "Name is too short").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  phone,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[A-Za-z]/, "Password needs at least one letter")
    .regex(/\d/, "Password needs at least one number"),
});

export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(3).max(120),
  password: z.string().min(1).max(72),
});