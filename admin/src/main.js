import "./style.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const tokenKey = "blogAdminToken";

let token = localStorage.getItem(tokenKey);
let editingPostId = null;

const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const dashboard = document.querySelector("#dashboard");
const status = document.querySelector("#status");
const postsList = document.querySelector("#posts-list");
const postForm = document.querySelector("#post-form");
const formHeading = document.querySelector("#form-heading");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");
const logoutButton = document.querySelector("#logout-button");
const commentsPanel = document.querySelector("#comments-panel");
const commentsHeading = document.querySelector("#comments-heading");
const commentsList = document.querySelector("#comments-list");

async function request(path, { method = "GET", body } = {}) {
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Request failed: ${response.status}`);
  }

  return result;
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
}

function logOut() {
  token = null;
  localStorage.removeItem(tokenKey);
  dashboard.hidden = true;
  loginPanel.hidden = false;
  loginForm.reset();
}

function resetPostForm() {
  editingPostId = null;
  postForm.reset();
  formHeading.textContent = "New post";
  saveButton.textContent = "Create post";
}

function addAction(container, label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;

  button.addEventListener("click", async () => {
    try {
      await action();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  container.append(button);
}

async function loadComments(post) {
  commentsHeading.textContent = `Comments on ${post.title}`;
  commentsPanel.hidden = false;
  commentsList.replaceChildren();

  const comments = await request(`/api/comments?postId=${post.id}`);

  if (comments.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No comments yet.";
    commentsList.append(empty);
  }

  for (const comment of comments) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const text = document.createElement("p");
    const actions = document.createElement("div");

    name.textContent = comment.authorName;
    text.textContent = comment.content;
    actions.className = "actions";

    addAction(actions, "Edit", async () => {
      const newName = window.prompt("Commenter's name", comment.authorName);
      if (newName === null) return;

      const newContent = window.prompt("Comment text", comment.content);
      if (newContent === null) return;

      if (!newName.trim() || !newContent.trim()) {
        throw new Error("Comment name and text cannot be empty");
      }

      await request(`/api/comments/${comment.id}`, {
        method: "PUT",
        body: {
          authorName: newName.trim(),
          content: newContent.trim(),
        },
      });

      await loadComments(post);
    });

    addAction(actions, "Delete", async () => {
      if (!window.confirm("Delete this comment?")) return;

      await request(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });

      await loadComments(post);
    });

    item.append(name, text, actions);
    commentsList.append(item);
  }
}

async function loadPosts() {
  const posts = await request("/api/admin/posts");
  postsList.replaceChildren();

  status.textContent = posts.length ? "" : "No posts yet.";

  for (const post of posts) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const state = document.createElement("span");
    const actions = document.createElement("div");

    title.textContent = post.title;
    state.textContent = post.published ? "Published" : "Draft";
    state.className = "post-state";
    actions.className = "actions";

    addAction(actions, "Edit", () => {
      editingPostId = post.id;
      postForm.elements.title.value = post.title;
      postForm.elements.content.value = post.content;
      formHeading.textContent = "Edit post";
      saveButton.textContent = "Save changes";
      postForm.elements.title.focus();
    });

    addAction(actions, post.published ? "Unpublish" : "Publish", async () => {
      await request(`/api/posts/${post.id}/published`, {
        method: "PATCH",
        body: { published: !post.published },
      });
      await loadPosts();
    });

    addAction(actions, "Comments", () => loadComments(post));

    addAction(actions, "Delete", async () => {
      if (!window.confirm(`Delete "${post.title}" and its comments?`)) {
        return;
      }

      await request(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      commentsPanel.hidden = true;
      resetPostForm();
      await loadPosts();
    });

    item.append(title, state, actions);
    postsList.append(item);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);

  try {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      },
    });

    token = result.token;
    localStorage.setItem(tokenKey, token);
    loginStatus.textContent = "";
    showDashboard();
    await loadPosts();
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(postForm);
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || !content) {
    status.textContent = "Title and content are required.";
    return;
  }

  try {
    await request(
      editingPostId === null ? "/api/posts" : `/api/posts/${editingPostId}`,
      {
        method: editingPostId === null ? "POST" : "PUT",
        body: { title, content },
      },
    );

    resetPostForm();
    await loadPosts();
  } catch (error) {
    status.textContent = error.message;
  }
});

cancelButton.addEventListener("click", resetPostForm);
logoutButton.addEventListener("click", logOut);

async function restoreSession() {
  if (!token) return;

  try {
    await request("/api/auth/me");
    showDashboard();
    await loadPosts();
  } catch {
    logOut();
  }
}

restoreSession();
