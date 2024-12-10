import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  posts: defineTable({
  postId: v.string(),
  part: v.number(),
  title: v.string(),
  content: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  accessType: v.union(v.literal("public"), v.literal("private")),
  accessUsers: v.array(v.string()), // First user would be the original creator
}).index("by_postId", ["postId"]),
});