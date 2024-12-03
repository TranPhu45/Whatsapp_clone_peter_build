import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const createConversation = mutation({
	args: {
		participants: v.array(v.id("users")),
		isGroup: v.boolean(),
		groupName: v.optional(v.string()),
		groupImage: v.optional(v.id("_storage")),
		admin: v.optional(v.id("users")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		// jane and john
		// [jane, john]
		// [john, jane]

		const existingConversation = await ctx.db
			.query("conversations")
			.filter((q) =>
				q.or(
					q.eq(q.field("participants"), args.participants),
					q.eq(q.field("participants"), args.participants.reverse())
				)
			)
			.first();

		if (existingConversation) {
			return existingConversation._id;
		}

		let groupImage;

		if (args.groupImage) {
			groupImage = (await ctx.storage.getUrl(args.groupImage)) as string;
		}

		const conversationId = await ctx.db.insert("conversations", {
			participants: args.participants,
			isGroup: args.isGroup,
			groupName: args.groupName,
			groupImage,
			admin: args.admin,
		});

		return conversationId;
	},
});

export const createUser = mutation({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Not authenticated");

		await ctx.db.insert("users", {
			tokenIdentifier: identity.tokenIdentifier,
			name: String(identity.firstName || ""),
			email: String(identity.emailAddress || ""),
			image: String(identity.pictureUrl || ""),
			isOnline: true
		});
	}
});

export const getMyConversations = query({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Not authenticated");

		const user = await ctx.db
			.query("users")
			.withIndex("by_tokenIdentifier", (q) => 
				q.eq("tokenIdentifier", identity.tokenIdentifier)
			)
			.first();

		if (!user) return null;

		// Lấy tất cả conversations
		const conversations = await ctx.db
			.query("conversations")
			.collect();

		// Lọc conversations mà user tham gia
		const myConversations = conversations.filter((conversation) => 
			conversation.participants.includes(user._id)
		);

		// Lấy thêm thông tin user cho non-group chats
		const conversationsWithDetails = await Promise.all(
			myConversations.map(async (conversation) => {
				if (!conversation.isGroup) {
					const otherUserId = conversation.participants.find(id => id !== user._id);
					if (otherUserId) {
						const otherUser = await ctx.db.get(otherUserId);
						return {
							...conversation,
							name: otherUser?.name,
							image: otherUser?.image,
							isOnline: otherUser?.isOnline
						};
					}
				}
				return conversation;
			})
		);

		return conversationsWithDetails;
	}
});

export const kickUser = mutation({
	args: {
		conversationId: v.id("conversations"),
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		const conversation = await ctx.db
			.query("conversations")
			.filter((q) => q.eq(q.field("_id"), args.conversationId))
			.unique();

		if (!conversation) throw new ConvexError("Conversation not found");

		await ctx.db.patch(args.conversationId, {
			participants: conversation.participants.filter((id) => id !== args.userId),
		});
	},
});

export const generateUploadUrl = mutation(async (ctx) => {
	return await ctx.storage.generateUploadUrl();
});

export const deleteConversation = mutation({
	args: { id: v.id("conversations") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new ConvexError("Unauthorized");

		// Xóa tất cả messages trong conversation
		const messages = await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("conversation"), args.id))
			.collect();

		for (const message of messages) {
			// Xóa file từ storage cho các loại message chứa file
			if (["image", "video", "file", "audio", "voice"].includes(message.messageType)) {
				try {
					// Kiểm tra nếu content là storage ID
					if (message.content.startsWith("kg") || message.content.startsWith("conv")) {
						await ctx.storage.delete(message.content as Id<"_storage">);
						console.log("Deleted file with storage ID:", message.content);
					}
				} catch (err) {
					console.error("Error deleting file from storage:", err, {
						messageId: message._id,
						content: message.content,
						type: message.messageType
					});
				}
			}
			// Xóa message
			await ctx.db.delete(message._id);
		}

		// Xóa conversation
		await ctx.db.delete(args.id);

		return {
			success: true,
			message: "Conversation and all associated files deleted"
		};
	},
});
