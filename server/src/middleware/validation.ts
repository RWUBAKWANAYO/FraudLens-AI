import { Request, Response, NextFunction } from "express";
import { validationResult, body } from "express-validator";

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const registerValidation = [
  body("fullName").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("companyName").notEmpty().withMessage("Company name is required"),
  body("companySlug").isSlug().withMessage("Company slug must be a valid URL slug"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const inviteUserValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("role").isIn(["ADMIN", "MANAGER", "ANALYST", "MEMBER"]).withMessage("Invalid role"),
];

export const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
];

export const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];
