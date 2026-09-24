import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import prisma from "../src/db.js";

test("blog API flow", async () => {
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", (error) => {
      if (error) reject(error);
      else resolve(instance);
    });
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  let postId = null;

  async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, options);
    const body = response.status === 204 ? null : await response.json();

    return { status: response.status, body };
  }

  try {
    const jsonHeaders = { "Content-Type": "application/json" };

    const health = await request("/api/health");
    assert.equal(health.status, 200);

    const missingRoute = await request("/api/unknown");
    assert.equal(missingRoute.status, 404);

    const withoutToken = await request("/api/admin/posts");
    assert.equal(withoutToken.status, 401);

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    });

    assert.equal(login.status, 200);
    assert.ok(login.body.token);

    const authHeaders = {
      ...jsonHeaders,
      Authorization: `Bearer ${login.body.token}`,
    };

    const createdPost = await request("/api/posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: "Temporary API test post",
        content: "This post tests the API.",
      }),
    });

    assert.equal(createdPost.status, 201);
    assert.equal(createdPost.body.published, false);
    postId = createdPost.body.id;

    const hiddenDraft = await request(`/api/posts/${postId}`);
    assert.equal(hiddenDraft.status, 404);

    const draftComments = await request(`/api/posts/${postId}/comments`);
    assert.equal(draftComments.status, 404);

    const editedPost = await request(`/api/posts/${postId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        title: "Updated API test post",
        content: "Updated content.",
      }),
    });

    assert.equal(editedPost.status, 200);
    assert.equal(editedPost.body.title, "Updated API test post");

    const publishedPost = await request(`/api/posts/${postId}/published`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ published: true }),
    });

    assert.equal(publishedPost.status, 200);
    assert.equal(publishedPost.body.published, true);

    const publicPost = await request(`/api/posts/${postId}`);
    assert.equal(publicPost.status, 200);

    const createdComment = await request(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        authorName: "Test Reader",
        content: "First comment",
      }),
    });

    assert.equal(createdComment.status, 201);
    const commentId = createdComment.body.id;

    const comments = await request(`/api/posts/${postId}/comments`);
    assert.equal(comments.status, 200);
    assert.ok(comments.body.some((comment) => comment.id === commentId));

    const editWithoutToken = await request(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({
        authorName: "Test Reader",
        content: "Edited comment",
      }),
    });

    assert.equal(editWithoutToken.status, 401);

    const editedComment = await request(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        authorName: "Test Reader",
        content: "Edited comment",
      }),
    });

    assert.equal(editedComment.status, 200);
    assert.equal(editedComment.body.content, "Edited comment");

    const deletedComment = await request(`/api/comments/${commentId}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    assert.equal(deletedComment.status, 204);

    const deletedPost = await request(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    assert.equal(deletedPost.status, 204);
    postId = null;
  } finally {
    try {
      if (postId !== null) {
        await prisma.post.deleteMany({ where: { id: postId } });
      }
    } finally {
      await prisma.$disconnect();
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
