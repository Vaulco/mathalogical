// posts.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper function to calculate string size in bytes
function getByteLength(str: string) {
  return new TextEncoder().encode(str).length;
}

export const get = query({
  args: { postId: v.string() },
  handler: async (ctx, { postId }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_postId", (q) => q.eq("postId", postId))
      .collect();
    
    // Sort by part number to ensure correct order
    posts.sort((a, b) => a.part - b.part);
    
    // Combine content from all parts
    const combinedContent = posts.map(p => p.content).join("");
    
    return {
      title: posts[0]?.title || "Untitled Document",
      content: combinedContent,
      postId,
    };
  },
});

export const update = mutation({
  args: {
    postId: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { postId, title, content }) => {
    // Don't proceed if content is empty (prevents deletion on initial load)
    if (!content && !title) return;

    // Split content into chunks of ~990KB
    const MAX_CHUNK_SIZE = 990 * 1024; // 990KB in bytes
    const chunks: string[] = [];
    let currentChunk = "";
    let currentSize = 0;
    
    // Split content into chunks
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const charSize = getByteLength(char);
      
      if (currentSize + charSize > MAX_CHUNK_SIZE) {
        chunks.push(currentChunk);
        currentChunk = char;
        currentSize = charSize;
      } else {
        currentChunk += char;
        currentSize += charSize;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Get existing parts
    const existingParts = await ctx.db
      .query("posts")
      .withIndex("by_postId", (q) => q.eq("postId", postId))
      .collect();

    // Update or create chunks as needed
    for (let i = 0; i < chunks.length; i++) {
      const existingPart = existingParts.find(p => p.part === i);
      
      if (existingPart) {
        // Update existing part
        await ctx.db.patch(existingPart._id, {
          content: chunks[i],
          title: i === 0 ? title : title + ` (part ${i + 1})`,
          updatedAt: Date.now(),
        });
      } else {
        // Create new part
        await ctx.db.insert("posts", {
          postId,
          part: i,
          title: i === 0 ? title : title + ` (part ${i + 1})`,
          content: chunks[i],
          userId: (await ctx.auth.getUserIdentity())?.subject ?? "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Remove any extra parts that are no longer needed
    for (const part of existingParts) {
      if (part.part >= chunks.length) {
        await ctx.db.delete(part._id);
      }
    }
  },
});
export const getDocumentInfo = query({
    args: { postId: v.string() },
    handler: async (ctx, { postId }) => {
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_postId", (q) => q.eq("postId", postId))
        .collect();
      
      if (posts.length === 0) {
        return null;
      }
  
      // Sort by part number to ensure correct order
      posts.sort((a, b) => a.part - b.part);
      
      // Combine content from all parts
      const combinedContent = posts.map(p => p.content).join("");
      
      // Get metadata from the first part
      const firstPart = posts[0];
      
      return {
        title: firstPart.title,
        content: combinedContent,
        createdAt: firstPart.createdAt,
        updatedAt: firstPart.updatedAt,
        postId,
        userId: firstPart.userId,
      };
    },
  });