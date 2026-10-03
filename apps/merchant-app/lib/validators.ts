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
// ───────── KYC + bank ─────────

export const BUSINESS_TYPES = [
  "Retail shop", "Restaurant / Food", "Services", "Sole proprietorship",
  "Partnership", "Private Limited", "Other",
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

const PAN_RE = /^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const kycSchema = z
  .object({
    businessType: z.enum(BUSINESS_TYPES),
    pan: z.string().trim().toUpperCase().regex(PAN_RE, "Enter a valid PAN (e.g. ABCPE1234F)"),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || GSTIN_RE.test(v), "Enter a valid 15-character GSTIN")
      .default(""),
    addressLine: z.string().trim().min(5, "Address is too short").max(120),
    city: z.string().trim().min(2).max(60),
    state: z.enum(INDIAN_STATES),
    pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  })
  // characters 3-12 of a GSTIN are the owner's PAN
  .refine((d) => !d.gstin || d.gstin.slice(2, 12) === d.pan, {
    message: "GSTIN does not match the PAN",
    path: ["gstin"],
  });

export const bankSchema = z
  .object({
    holderName: z.string().trim().min(2).max(80),
    accountNo: z.string().trim().regex(/^\d{9,18}$/, "Account number must be 9 to 18 digits"),
    confirmAccountNo: z.string().trim(),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC (e.g. HDFC0001234)"),
  })
  .refine((d) => d.accountNo === d.confirmAccountNo, {
    message: "Account numbers do not match",
    path: ["confirmAccountNo"],
  });
export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(3).max(120),
  password: z.string().min(1).max(72),
});