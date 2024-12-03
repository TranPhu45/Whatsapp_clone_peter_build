import OpenAI from "openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

// export const chat = action({
// 	args: {
// 		messageBody: v.string(),
// 		conversation: v.id("conversations"),
// 	},
// 	handler: async (ctx, args) => {
// 		const res = await openai.chat.completions.create({
// 			model: "gpt-3.5-turbo", // "gpt-4" also works, but is so slow!
// 			messages: [
// 				{
// 					role: "system",
// 					content: "You are a terse bot in a group chat responding to questions with 1-sentence answers",
// 				},
// 				{
// 					role: "user",
// 					content: args.messageBody,
// 				},
// 			],
// 		});

// 		const messageContent = res.choices[0].message.content;

// 		await ctx.runMutation(api.messages.sendChatGPTMessage, {
// 			content: messageContent ?? "I'm sorry, I don't have a response for that",
// 			conversation: args.conversation,
// 			messageType: "text",
// 		});
// 	},
// });

export const chat = action({
	args: {
	  messageBody: v.string(),
	  conversation: v.id("conversations"),
	  contextMessages: v.optional(
		v.array(
		  v.object({
			role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
			content: v.string(),
		  })
		)
	  ),
	},
	handler: async (ctx, args) => {
	  // Default to an empty array if no context is provided
	  const contextMessages = args.contextMessages || [];
  
	  // Add the user's current message to the context
	  contextMessages.push({ role: "user", content: args.messageBody });
  
	  // Define the system prompt
	  const systemPrompt = `You are a terse bot in a group chat responding to questions with detail and clearly answers`;
  
	  // Debugging: Log context messages and the full prompt
	  console.log("System Prompt Sent to OpenAI:", systemPrompt);
	  console.log("Context Messages Sent to OpenAI:", contextMessages);
  
	  try {
		// Make the API request to OpenAI
		const res = await openai.chat.completions.create({
		  model: "gpt-4o", // Ensure you use GPT-4 for better detailed responses
		  messages: [
			{
			  role: "system",
			  content: systemPrompt,
			},
			...contextMessages,
		  ],
		});
  
		// Extract the AI's response content
		const messageContent = res.choices[0].message.content;
  
		// Debugging: Log the response from OpenAI
		console.log("Response from OpenAI:", messageContent);
  
		// Save the AI's response to the database
		await ctx.runMutation(api.messages.sendChatGPTMessage, {
		  content: messageContent ?? "I'm sorry, I don't have a response for that.",
		  conversation: args.conversation,
		  messageType: "text",
		});
	  } catch (error) {
		// Debugging: Log any errors that occur
		console.error("Error in OpenAI API Call:", error);
  
		// Optionally save an error message to the database
		await ctx.runMutation(api.messages.sendChatGPTMessage, {
		  content: "I'm sorry, an error occurred while processing your request.",
		  conversation: args.conversation,
		  messageType: "text",
		});
	  }
	},
  });

export const dall_e = action({
	args: {
		conversation: v.id("conversations"),
		messageBody: v.string(),
	},
	handler: async (ctx, args) => {
		const res = await openai.images.generate({
			model: "dall-e-3",
			prompt: args.messageBody,
			n: 1,
			size: "1024x1024",
		});

		const imageUrl = res.data[0].url;
		await ctx.runMutation(api.messages.sendChatGPTMessage, {
			content: imageUrl ?? "/poopenai.png",
			conversation: args.conversation,
			messageType: "image",
		});
	},
});

// 1 token ~= 4 chars in English
// 1 token ~= ¾ words
// 100 tokens ~= 75 words
// Or
// 1-2 sentence ~= 30 tokens
// 1 paragraph ~= 100 tokens
// 1,500 words ~= 2048 tokens

// 1 image will cost $0,04(4 cents) => dall-e-3
// 1 image will cost $0,02(2 cents) => dall-e-2
