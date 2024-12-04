import { ConvexError, v } from "convex/values";
import { internalMutation, query, mutation } from "./_generated/server";


// export const createUser = internalMutation({
//  args: {
//      tokenIdentifier: v.string(),
//      email: v.string(),
//      name: v.string(),
//      image: v.string(),
//  },
//  handler: async (ctx, args) => {
//      await ctx.db.insert("users", {
//          tokenIdentifier: args.tokenIdentifier,
//          email: args.email,
//          name: args.name,
//          image: args.image,
//          isOnline: true,
//      });
//  },
// });
export const createUser = internalMutation({
    args: {
        tokenIdentifier: v.string(),
        email: v.string(),
        name: v.string(),
        image: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if email already exists
        const existingUser = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("email"), args.email))
            .first();


        if (existingUser) {
            throw new ConvexError("Email đã tồn tại");
        }


        // Create new user if email does not exist
        await ctx.db.insert("users", {
            tokenIdentifier: args.tokenIdentifier,
            email: args.email,
            name: args.name,
            image: args.image,
            isOnline: true,
        });
    },
});


export const updateUser = internalMutation({
    args: { tokenIdentifier: v.string(), image: v.string(), name: v.string() },
    async handler(ctx, args) {
      const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .unique();
 
      if (!user) {
            throw new ConvexError("User not found");
      }
 
      await ctx.db.patch(user._id, {
            image: args.image,
      });
    },
  });


  export const updateUserName = mutation({
    args: {
      tokenIdentifier: v.string(),
      newName: v.string(),
    },
    async handler(ctx, args) {
      const user = await ctx.db
        .query("users")
        .filter(q => q.eq(q.field("tokenIdentifier"), args.tokenIdentifier))
        .first();
 
      if (!user) {
        throw new Error("User not found");
      }
 
      await ctx.db.patch(user._id, { name: args.newName });
    },
  });


export const setUserOnline = internalMutation({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .unique();


        if (!user) {
            throw new ConvexError("User not found");
        }


        await ctx.db.patch(user._id, { isOnline: true });
    },
});


export const setUserOffline = internalMutation({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .unique();


        if (!user) {
            throw new ConvexError("User not found");
        }


        await ctx.db.patch(user._id, { isOnline: false });
    },
});


export const getUsers = query({
    args: {},
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        // Lấy thông tin user hiện tại
        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .first();

        if (!currentUser) return [];

        // Lấy tất cả users và lọc bỏ user hiện tại
        const users = await ctx.db.query("users").collect();
        return users.filter((user) => user._id !== currentUser._id);
    },
});
// export const getUsers = query({
//  args: {},
//  handler: async (ctx, args) => {
//      const identity = await ctx.auth.getUserIdentity();
//      if (!identity) {
//          throw new ConvexError("Unauthorized");
//      }


//      const users = await ctx.db.query("users").collect();


//      // Group users by email
//      const userMap = new Map();
//      users.forEach(user => {
//          if (!userMap.has(user.email)) {
//              userMap.set(user.email, { ...user, isOnline: false });
//          }
//          if (user.isOnline) {
//              userMap.get(user.email).isOnline = true;
//          }
//      });


//      // Convert map to array and remove current user
//      const uniqueUsers = Array.from(userMap.values()).filter(
//          (user) => user.tokenIdentifier !== identity.tokenIdentifier
//      );


//      return uniqueUsers;
//  },
// });


export const getMe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    return user; // Có thể trả về null nếu không tìm thấy user
  },
});

export const createInitialUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Kiểm tra user đã tồn tại
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (existingUser) return; // Skip nếu đã tồn tại

    await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name || identity.email?.split('@')[0] || '',
      email: identity.email || '',
      image: identity.pictureUrl || '',
      isOnline: true
    });
  }
});


export const getGroupMembers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];


        const conversation = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("_id"), args.conversationId))
            .first();
        if (!conversation) return [];


        const users = await ctx.db.query("users").collect();
        return users.filter((user) => conversation.participants.includes(user._id));
    },
});

export const checkDuplicateUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .collect();
    
    // Group by tokenIdentifier
    const grouped: Record<string, typeof users> = users.reduce((acc, user) => {
      acc[user.tokenIdentifier] = (acc[user.tokenIdentifier] || []).concat(user);
      return acc;
    }, {} as Record<string, typeof users>);

    return Object.entries(grouped)
      .filter(([_, users]) => users.length > 1);
  }
});

export const removeDuplicateUsers = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const users = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .collect();

    // Giữ lại bản ghi mới nhất
    users.sort((a, b) => b._creationTime - a._creationTime);
    
    // Xóa các bản ghi cũ
    for (let i = 1; i < users.length; i++) {
      await ctx.db.delete(users[i]._id);
    }
  }
});