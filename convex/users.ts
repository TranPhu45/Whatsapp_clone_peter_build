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
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }


        const users = await ctx.db.query("users").collect();
        return users.filter((user) => user.tokenIdentifier !== identity.tokenIdentifier);
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
    args: {},
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }


        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();


        if (!user) {
            throw new ConvexError("User not found");
        }


        return user;
    },
});


export const getGroupMembers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();


        if (!identity) {
            throw new ConvexError("Unauthorized");
        }


        const conversation = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("_id"), args.conversationId))
            .first();
        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }


        const users = await ctx.db.query("users").collect();
        const groupMembers = users.filter((user) => conversation.participants.includes(user._id));


        return groupMembers;
    },
});