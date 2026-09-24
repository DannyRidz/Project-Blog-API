import "./style.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const postList = document.querySelector("#post-list");
const postStatus = document.querySelector("#post-status");
const postDetail = document.querySelector("#post-detail");
const postTitle = document.querySelector("#post-title");
const postMeta = document.querySelector("#post-meta");
const postContent = document.querySelector("#post-content");
const commentsList = document.querySelector("#comments-list");
const commentForm = document.querySelector("#comment-form");
const commentStatus = document.querySelector("#comment-status");

let selectedPostId = null;

async function getJson(path) {
  const response = await fetch(`${apiUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function showPost(id) {
  try {
    const [post, comments] = await Promise.all([
      getJson(`/api/posts/${id}`),
      getJson(`/api/posts/${id}/comments`),
    ]);

    selectedPostId = id;
    postTitle.textContent = post.title;
    postMeta.textContent = `By ${post.author.name} • ${new Date(post.createdAt).toLocaleString()}`;
    postContent.textContent = post.content;

    commentsList.replaceChildren();

    for (const comment of comments) {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      const text = document.createElement("p");

      name.textContent = comment.authorName;
      text.textContent = comment.content;
      item.append(name, text);
      commentsList.append(item);
    }

    postDetail.hidden = false;
    commentStatus.textContent = "";
  } catch {
    selectedPostId = null;
    postDetail.hidden = true;
    postStatus.textContent = "Could not load this post.";
  }
}

async function loadPosts() {
  try {
    const posts = await getJson("/api/posts");

    postList.replaceChildren();
    postStatus.textContent = posts.length ? "" : "No published posts yet.";

    for (const post of posts) {
      const button = document.createElement("button");
      button.className = "post-link";
      button.type = "button";
      button.textContent = post.title;
      button.addEventListener("click", () => showPost(post.id));
      postList.append(button);
    }
  } catch {
    postStatus.textContent =
      "Could not load posts. Check that the API is running.";
  }
}

commentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (selectedPostId === null) return;

  const formData = new FormData(commentForm);
  const authorName = String(formData.get("authorName") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  commentStatus.textContent = "Sending comment...";

  try {
    const response = await fetch(
      `${apiUrl}/api/posts/${selectedPostId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, content }),
      },
    );

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const postId = selectedPostId;
    commentForm.reset();
    await showPost(postId);
    commentStatus.textContent = "Comment added.";
  } catch {
    commentStatus.textContent = "Could not add comment. Please try again.";
  }
});

loadPosts();
