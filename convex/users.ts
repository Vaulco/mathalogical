import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Updated viewer query to include GitHub profile data
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const user = await ctx.db.get(userId);
    return user;
  },
});

// Add mutation to update GitHub profile data
export const updateGithubProfile = mutation({
  args: {
    githubUsername: v.string(),
    githubAvatarUrl: v.string(),
  },
  handler: async (ctx, { githubUsername, githubAvatarUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    await ctx.db.patch(userId, {
      image: githubAvatarUrl,
      name: githubUsername,
    });
  },
  
});
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    // Retrieve all users, excluding the current authenticated user if needed
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

export const getAllowedEmail = query(async () => {
  return process.env.ALLOWED_EMAIL;
});