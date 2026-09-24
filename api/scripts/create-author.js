import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/db.js";

const name = process.env.ADMIN_NAME;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || !email || !password) {
  throw new Error("ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required");
}

try {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("Author already exists");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "AUTHOR",
      },
    });

    console.log("Author created");
  }
} finally {
  await prisma.$disconnect();
}
