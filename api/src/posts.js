import { Router } from "express";
import prisma from "./db.js";
import { requireAuthor } from "./auth.js";

const postsRouter = Router();
const adminPostsRouter = Router();

const authorInfo = {
  author: {
    select: { id: true, name: true },
  },
};

function getPostId(req, res) {
  const id = Number(req.params.postId);

  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid post ID" });
    return null;
  }

  return id;
}

postsRouter.get("/", async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: authorInfo,
  });

  res.json(posts);
});

postsRouter.get("/:postId", async (req, res) => {
  const id = getPostId(req, res);
  if (id === null) return;

  const post = await prisma.post.findFirst({
    where: { id, published: true },
    include: authorInfo,
  });

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  res.json(post);
});

adminPostsRouter.use(requireAuthor);

adminPostsRouter.get("/", async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { authorId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: authorInfo,
  });

  res.json(posts);
});

postsRouter.post("/", requireAuthor, async (req, res) => {
  const { title, content } = req.body ?? {};

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const post = await prisma.post.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      authorId: req.user.id,
    },
    include: authorInfo,
  });

  res.status(201).json(post);
});

postsRouter.put("/:postId", requireAuthor, async (req, res) => {
  const id = getPostId(req, res);
  if (id === null) return;

  const { title, content } = req.body ?? {};

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const result = await prisma.post.updateMany({
    where: { id, authorId: req.user.id },
    data: {
      title: title.trim(),
      content: content.trim(),
    },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: authorInfo,
  });

  res.json(post);
});

postsRouter.patch("/:postId/published", requireAuthor, async (req, res) => {
  const id = getPostId(req, res);
  if (id === null) return;

  const { published } = req.body ?? {};

  if (typeof published !== "boolean") {
    return res.status(400).json({ error: "Published must be true or false" });
  }

  const result = await prisma.post.updateMany({
    where: { id, authorId: req.user.id },
    data: { published },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: authorInfo,
  });

  res.json(post);
});

postsRouter.delete("/:postId", requireAuthor, async (req, res) => {
  const id = getPostId(req, res);
  if (id === null) return;

  const result = await prisma.post.deleteMany({
    where: { id, authorId: req.user.id },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: "Post not found" });
  }

  res.status(204).send();
});

export { postsRouter, adminPostsRouter };
