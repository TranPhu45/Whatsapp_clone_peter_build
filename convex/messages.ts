import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { Message } from "./types";

export const sendTextMessage = mutation({
	args: {
	  sender: v.string(),
	  content: v.string(),
	  conversation: v.id("conversations"),
	},
	handler: async (ctx, args) => {
	  const identity = await ctx.auth.getUserIdentity();
	  if (!identity) {
		throw new ConvexError("Not authenticated");
	  }
  
	  const user = await ctx.db
		.query("users")
		.withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
		.unique();
  
	  if (!user) {
		throw new ConvexError("User not found");
	  }
  
	  const conversation = await ctx.db
		.query("conversations")
		.filter((q) => q.eq(q.field("_id"), args.conversation))
		.first();
  
	  if (!conversation) {
		throw new ConvexError("Conversation not found");
	  }
  
	  if (!conversation.participants.includes(user._id)) {
		throw new ConvexError("You are not part of this conversation");
	  }
  
	  // Save the user's message
	  await ctx.db.insert("messages", {
		sender: args.sender,
		content: args.content,
		conversation: args.conversation,
		messageType: "text",
	  });
  
	  if (args.content.startsWith("@gpt")) {
		// Fetch the last 5 messages for context
		const allMessages = await ctx.db
		  .query("messages")
		  .withIndex("by_conversation", (q) => q.eq("conversation", args.conversation))
		  .collect();
  
		// Sort messages by creation time in descending order and take the last 5
		const previousMessages = allMessages
		  .sort((a, b) => b._creationTime - a._creationTime)
		  .slice(0, 5);
  
		// Format the messages for OpenAI API with strong typing for role
		const contextMessages = previousMessages.reverse().map((msg) => ({
		  role: (msg.sender === "ChatGPT" ? "assistant" : "user") as "system" | "user" | "assistant",
		  content: msg.content,
		}));
  
		// Add the user's message to the context
		contextMessages.push({ role: "user", content: args.content });
  
		// Call the OpenAI chat action with context
		await ctx.scheduler.runAfter(0, api.openai.chat, {
		  messageBody: args.content,
		  conversation: args.conversation,
		  contextMessages, // Pass the context
		});
	  }
  
	  if (args.content.startsWith("@dall-e")) {
		await ctx.scheduler.runAfter(0, api.openai.dall_e, {
		  messageBody: args.content,
		  conversation: args.conversation,
		});
	  }
	},
  });

export const getGPTMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // Fetch recent messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversation", args.conversationId))
      .order("desc") // Sort by newest first
      .take(10); // Fetch the last 10 messages

    // Filter messages that contain "@gpt"
    const gptMessages = messages.filter((msg) => msg.content.includes("@gpt"));

    return gptMessages;
  },
});


export const sendChatGPTMessage = mutation({
	args: {
		content: v.string(),
		conversation: v.id("conversations"),
		messageType: v.union(v.literal("text"), v.literal("image")),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("messages", {
			content: args.content,
			sender: "ChatGPT",
			messageType: args.messageType,
			conversation: args.conversation,
		});
	},
});

// Optimized
export const getMessages = query({
	args: {
		conversation: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) => q.eq("conversation", args.conversation))
			.collect();

		const userProfileCache = new Map();

		const messagesWithSender = await Promise.all(
			messages.map(async (message) => {
				if (message.sender === "ChatGPT") {
					const image = message.messageType === "text" ? "/gpt.png" : "dall-e.png";
					return { ...message, sender: { name: "ChatGPT", image } };
				}
				let sender;
				// Check if sender profile is in cache
				if (userProfileCache.has(message.sender)) {
					sender = userProfileCache.get(message.sender);
				} else {
					// Fetch sender profile from the database
					sender = await ctx.db
						.query("users")
						.filter((q) => q.eq(q.field("_id"), message.sender))
						.first();
					// Cache the sender profile
					userProfileCache.set(message.sender, sender);
				}

				return { ...message, sender };
			})
		);

		return messagesWithSender;
	},
});

export const sendImage = mutation({
	args: { imgId: v.id("_storage"), sender: v.id("users"), conversation: v.id("conversations") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		const content = (await ctx.storage.getUrl(args.imgId)) as string;

		await ctx.db.insert("messages", {
			content: content,
			sender: args.sender,
			messageType: "image",
			conversation: args.conversation,
		});
	},
});

export const sendVideo = mutation({
	args: { videoId: v.id("_storage"), sender: v.id("users"), conversation: v.id("conversations") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		const content = (await ctx.storage.getUrl(args.videoId)) as string;

		await ctx.db.insert("messages", {
			content: content,
			sender: args.sender,
			messageType: "video",
			conversation: args.conversation,
		});
	},
});

export const sendFile = mutation({
    args: { fileId: v.id("_storage"), sender: v.id("users"), conversation: v.id("conversations"), fileName: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const content = (await ctx.storage.getUrl(args.fileId)) as string;

        await ctx.db.insert("messages", {
            content: content,
            sender: args.sender,
            messageType: "file",
            conversation: args.conversation,
            fileName: args.fileName,
        });
    },
});

export const deleteConversation = mutation({
	args: {
	  userId: v.id("users"),
	  conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
	  const user = await ctx.db
		.query("users")
		.filter((q) => q.eq(q.field("_id"), args.userId))
		.first();
  
	  if (!user) {
		throw new ConvexError("User not found");
	  }
  
	  const conversation = await ctx.db.get(args.conversationId);
  
	  if (!conversation) {
		throw new ConvexError("Conversation not found");
	  }
  
	  if (!conversation.participants.includes(user._id)) {
		throw new ConvexError("Unauthorized to delete this conversation");
	  }
  
	  const messages = await ctx.db
		.query("messages")
		.filter((q) => q.eq(q.field("conversation"), args.conversationId))
		.collect();
  
	  await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
  
	  await ctx.db.delete(args.conversationId);
  
	  return {
		success: true,
		deletedMessages: messages.length,
	  };
	},
  });

export const sendAudio = mutation({
	args: {
	  audioId: v.id("_storage"),
	  conversation: v.id("conversations"),
	  sender: v.id("users"),
	},
	handler: async (ctx, args) => {
	  const identity = await ctx.auth.getUserIdentity();
	  if (!identity) {
		throw new ConvexError("Unauthorized");
	  }

	  const content = (await ctx.storage.getUrl(args.audioId)) as string;

	  await ctx.db.insert("messages", {
		content: content,
		sender: args.sender,
		messageType: "audio",
		conversation: args.conversation,
	  });
	},
});

// unoptimized

// export const getMessages = query({
// 	args:{
// 		conversation: v.id("conversations"),
// 	},
// 	handler: async (ctx, args) => {
// 		const identity = await ctx.auth.getUserIdentity();
// 		if (!identity) {
// 			throw new ConvexError("Not authenticated");
// 		}

// 		const messages = await ctx.db
// 		.query("messages")
// 		.withIndex("by_conversation", q=> q.eq("conversation", args.conversation))
// 		.collect();

// 		// john => 200 , 1
// 		const messagesWithSender = await Promise.all(
// 			messages.map(async (message) => {
// 				const sender = await ctx.db
// 				.query("users")
// 				.filter(q => q.eq(q.field("_id"), message.sender))
// 				.first();

// 				return {...message,sender}
// 			})
// 		)

// 		return messagesWithSender;
// 	}
// });
