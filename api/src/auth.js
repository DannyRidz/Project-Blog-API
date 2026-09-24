import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "./db.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  const passwordMatches =
    user && (await bcrypt.compare(password, user.passwordHash));

  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
    subject: String(user.id),
  });

  return res.json({ token });
});

export function requireAuthor(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Bearer token required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (typeof payload === "string" || payload.role !== "AUTHOR") {
      return res.status(403).json({ error: "Author access required" });
    }

    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

router.get("/me", requireAuthor, (req, res) => {
  res.json({ user: req.user });
});

export default router;
