import express from "express";
import cors from "cors";
import authRouter from "./auth.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
