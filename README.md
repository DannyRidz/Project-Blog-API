# Blog API

A full-stack blog project containing a REST API and two separate frontends.

## Applications

- `api`: Express API, Prisma, PostgreSQL, and JWT authentication
- `reader`: Public website for reading posts and submitting comments
- `admin`: Private website for creating and managing posts and comments

## Data models

### User

Represents an author who can manage the blog.

- `id`: Unique integer identifier
- `name`: Author's display name
- `email`: Unique email used to log in
- `passwordHash`: Hashed version of the author's password
- `role`: User's authorization role
- `createdAt`: Date and time the user was created
- `updatedAt`: Date and time the user was last updated

A user can write many posts.

### Post

Represents a blog article.

- `id`: Unique integer identifier
- `title`: Post title
- `content`: Main post content
- `published`: Whether the public can see the post
- `createdAt`: Date and time the post was created
- `updatedAt`: Date and time the post was last updated
- `authorId`: ID of the user who wrote the post

A post belongs to one user and can have many comments.

### Comment

Represents a public comment on a post.

- `id`: Unique integer identifier
- `authorName`: Display name entered by the commenter
- `content`: Comment text
- `createdAt`: Date and time the comment was created
- `postId`: ID of the post receiving the comment

A comment belongs to one post.

## Relationships

- One user can have many posts.
- Each post belongs to one user.
- One post can have many comments.
- Each comment belongs to one post.
- Deleting a post also deletes its comments.

## API endpoints

### Authentication

- `POST /api/auth/login`: Log in and receive a JWT

### Public posts

- `GET /api/posts`: Retrieve all published posts
- `GET /api/posts/:postId`: Retrieve one published post
- `GET /api/posts/:postId/comments`: Retrieve comments for a published post
- `POST /api/posts/:postId/comments`: Add a comment to a published post

### Protected post management

- `GET /api/admin/posts`: Retrieve published and unpublished posts
- `POST /api/posts`: Create a post
- `PUT /api/posts/:postId`: Update a post
- `PATCH /api/posts/:postId/published`: Publish or unpublish a post
- `DELETE /api/posts/:postId`: Delete a post

### Protected comment management

- `PUT /api/comments/:commentId`: Edit a comment
- `DELETE /api/comments/:commentId`: Delete a comment
- `GET /api/comments?postId=:postId`: Retrieve comments for an authored post

## Authentication rules

The login endpoint returns a JSON Web Token, or JWT. The admin frontend sends the token in an HTTP header when accessing a protected endpoint:

```text
Authorization: Bearer <token>
```

Public users can read published posts and submit comments without logging in. Only authenticated authors can create, edit, publish, unpublish, or delete posts and manage comments.
