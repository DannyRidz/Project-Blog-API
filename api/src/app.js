import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./auth.js";
import { postsRouter, adminPostsRouter } from "./posts.js";
import { postCommentsRouter, adminCommentsRouter } from "./comments.js";

const app = express();

const allowedOrigins = (
  process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.use("/api/admin/posts", adminPostsRouter);
app.use("/api/posts", postCommentsRouter);
app.use("/api/comments", adminCommentsRouter);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
