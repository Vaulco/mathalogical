import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_CHUNK_SIZE = Math.floor(1 * 1024 * 1024 / 100);
type AccessType = 'public' | 'private';

const getChunkedContent = (content: string) => {
  const chunks: string[] = [];
  let currentChunk = "", currentSize = 0;
  const encoder = new TextEncoder();
  
  for (const char of content) {
    const charSize = encoder.encode(char).length;
    if (currentSize + charSize > MAX_CHUNK_SIZE) {
      chunks.push(currentChunk);
      currentChunk = char;
      currentSize = charSize;
    } else {
      currentChunk += char;
      currentSize += charSize;
    }
  }
  return currentChunk ? [...chunks, currentChunk] : chunks;
};

export const get = query({
  args: { postId: v.string() },
  handler: async (ctx, { postId }) => {
    const [identity, posts] = await Promise.all([
      ctx.auth.getUserIdentity(),
      ctx.db.query("posts").withIndex("by_postId", q => q.eq("postId", postId)).collect()
    ]);
    
    return posts.length ? {
      title: posts[0].title || "Untitled Document",
      content: posts.sort((a, b) => a.part - b.part).map(p => p.content).join(""),
      updatedAt: Math.max(...posts.map(p => p.updatedAt)),
      postId,
      accessType: posts[0].accessType,
      accessUsers: posts[0].accessUsers,
    } : null;
  }
});

const handleDocumentParts = async (ctx: any, postId: string, title: string, content: string, identity: any, existingParts: any[]) => {
  const extractedUserId = identity.subject.split('|')[0];
  const accessUsers = Array.from(new Set([
    ...(process.env.ALLOWED_EMAIL && identity.email === process.env.ALLOWED_EMAIL ? [] : []),
    extractedUserId
  ]));

  if (!content.trim()) {
    if (!existingParts.length) {
      await ctx.db.insert("posts", {
        postId, part: 0, title: title || 'Untitled Document',
        content: '', createdAt: Date.now(), updatedAt: Date.now(),
        accessType: "private" as AccessType, accessUsers
      });
    } else {
      await Promise.all(existingParts.map(part => 
        ctx.db.patch(part._id, { 
          title: title || 'Untitled Document', 
          updatedAt: Date.now() 
        })
      ));
    }
    return;
  }

  const chunks = getChunkedContent(content);
  await Promise.all([
    ...chunks.map((chunk, i) => {
      const existingPart = existingParts.find(p => p.part === i);
      const partData = {
        postId, part: i,
        title: i === 0 ? title : `${title} (part ${i + 1})`,
        content: chunk, createdAt: Date.now(), updatedAt: Date.now(),
        accessType: "private" as AccessType,
        accessUsers: i === 0 ? accessUsers : existingParts[i]?.accessUsers || [],
      };
      return existingPart 
        ? ctx.db.patch(existingPart._id, { content: chunk, title: partData.title, updatedAt: Date.now() })
        : ctx.db.insert("posts", partData);
    }),
    ...existingParts.filter(part => part.part >= chunks.length).map(part => ctx.db.delete(part._id))
  ]);
};

export const update = mutation({
  args: { postId: v.string(), title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingParts = await ctx.db.query("posts")
      .withIndex("by_postId", q => q.eq("postId", args.postId))
      .collect();

    const extractedUserId = identity.subject.split('|')[0];
    if (existingParts.length && 
        !existingParts[0].accessUsers.includes(extractedUserId) && 
        !(process.env.ALLOWED_EMAIL && identity.email === process.env.ALLOWED_EMAIL)) {
      throw new Error("Not authorized to modify this document");
    }

    await handleDocumentParts(ctx, args.postId, args.title, args.content, identity, existingParts);
  }
});

export const create = mutation({
  args: { postId: v.string(), title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingParts = await ctx.db.query("posts")
      .withIndex("by_postId", q => q.eq("postId", args.postId))
      .collect();

    if (!existingParts.length) {
      await handleDocumentParts(ctx, args.postId, args.title, args.content, identity, []);
      return { success: true };
    }

    if (existingParts.some(part => part.content.trim() !== '')) {
      throw new Error("Document already exists");
    }

    await handleDocumentParts(ctx, args.postId, args.title, args.content, identity, existingParts);
    return { success: true };
  }
});

export const updateDocumentAccess = mutation({
  args: {
    postId: v.string(),
    accessType: v.union(v.literal('public'), v.literal('private')),
    users: v.array(v.string()),
  },
  handler: async (ctx, { postId, accessType, users }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const extractedUserId = identity.subject.split('|')[0];
    
    const parts = await ctx.db.query("posts")
      .withIndex("by_postId", q => q.eq("postId", postId))
      .collect();
    
    const existingUsers = parts[0].accessUsers || [];
    const newUsers = users.length > 0 
      ? Array.from(new Set([
          ...existingUsers,
          ...users,
          ...(process.env.ALLOWED_EMAIL && identity.email === process.env.ALLOWED_EMAIL ? [] : [extractedUserId]),
        ])) 
      : existingUsers;

    await Promise.all(parts.map(part => 
      ctx.db.patch(part._id, { accessType, accessUsers: newUsers })
    ));
    return { success: true };
  }
});

export const getUsersWithDocumentAccess = query({
  args: { postId: v.string() },
  handler: async (ctx, { postId }) => {
    const parts = await ctx.db.query("posts")
      .withIndex("by_postId", q => q.eq("postId", postId))
      .collect();
    
    return parts.length 
      ? (await Promise.all(
          Array.from(new Set(parts[0].accessUsers))
            .map(userId => ctx.db.query("users")
              .filter(q => q.eq(q.field("_id"), userId))
              .first()
            )
        )).filter(Boolean)
      : [];
  }
});