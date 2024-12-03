import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		name: v.string(),
		email: v.string(),
		image: v.string(),
		tokenIdentifier: v.string(),
		isOnline: v.boolean(),
	}).index("by_tokenIdentifier", ["tokenIdentifier"]),

	conversations: defineTable({
		participants: v.array(v.id("users")),
		isGroup: v.boolean(),
		groupName: v.optional(v.string()),
		groupImage: v.optional(v.string()),
		admin: v.optional(v.id("users")),
	}),

	messages: defineTable({
		content: v.string(),
		sender: v.string(),
		conversation: v.id("conversations"),
		messageType: v.union(
			v.literal("text"),
			v.literal("image"),
			v.literal("video"),
			v.literal("file"),
			v.literal("audio"),
			v.literal("voice")
		),
		fileName: v.optional(v.string()),
	}).index("by_conversation", ["conversation"]),
});