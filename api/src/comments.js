import { Router } from "express";
import prisma from "./db.js";
import { requireAuthor } from "./auth.js";

const postCommentsRouter = Router();
const adminCommentsRouter = Router();

function getId(req, res, parameterName) {
  const id = Number(req.params[parameterName]);

  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid ID" });
    return null;
  }

  return id;
}

async function findPublishedPost(id) {
  return prisma.post.findFirst({
    where: { id, published: true },
    select: { id: true },
  });
}

postCommentsRouter.get("/:postId/comments", async (req, res) => {
  const postId = getId(req, res, "postId");
  if (postId === null) return;

  const post = await findPublishedPost(postId);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });

  res.json(comments);
});

postCommentsRouter.post("/:postId/comments", async (req, res) => {
  const postId = getId(req, res, "postId");
  if (postId === null) return;

  const post = await findPublishedPost(postId);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const { authorName, content } = req.body ?? {};

  if (
    typeof authorName !== "string" ||
    !authorName.trim() ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return res.status(400).json({
      error: "Author name and content are required",
    });
  }

  const comment = await prisma.comment.create({
    data: {
      authorName: authorName.trim(),
      content: content.trim(),
      postId,
    },
  });

  res.status(201).json(comment);
});

adminCommentsRouter.use(requireAuthor);

adminCommentsRouter.get("/", async (req, res) => {
  const postId = Number(req.query.postId);

  if (!Number.isSafeInteger(postId) || postId < 1) {
    return res.status(400).json({ error: "Invalid post ID" });
  }

  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: req.user.id },
    select: { id: true },
  });

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });

  res.json(comments);
});

adminCommentsRouter.put("/:commentId", async (req, res) => {
  const id = getId(req, res, "commentId");
  if (id === null) return;

  const { authorName, content } = req.body ?? {};

  if (
    typeof authorName !== "string" ||
    !authorName.trim() ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return res.status(400).json({
      error: "Author name and content are required",
    });
  }

  const existingComment = await prisma.comment.findFirst({
    where: {
      id,
      post: { is: { authorId: req.user.id } },
    },
  });

  if (!existingComment) {
    return res.status(404).json({ error: "Comment not found" });
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: {
      authorName: authorName.trim(),
      content: content.trim(),
    },
  });

  res.json(comment);
});

adminCommentsRouter.delete("/:commentId", async (req, res) => {
  const id = getId(req, res, "commentId");
  if (id === null) return;

  const existingComment = await prisma.comment.findFirst({
    where: {
      id,
      post: { is: { authorId: req.user.id } },
    },
  });

  if (!existingComment) {
    return res.status(404).json({ error: "Comment not found" });
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).send();
});

export { postCommentsRouter, adminCommentsRouter };
