import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSeenSvg } from "@/lib/svgs";
import { ImageIcon, Users, VideoIcon, Trash } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConversationStore } from "@/store/chat-store";
import { useMutation } from "convex/react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";


const Conversation = ({ conversation }: { conversation: any }) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const deleteConversation = useMutation(api.messages.deleteConversation);
    const conversationImage = conversation.groupImage || conversation.image;
    const conversationName = conversation.groupName || conversation.name;
    const lastMessage = conversation.lastMessage;
    const lastMessageType = lastMessage?.messageType;
    const me = useQuery(api.users.getMe);

    const { setSelectedConversation, selectedConversation } = useConversationStore();
    
    const activeBgClass = selectedConversation?._id === conversation._id;

    const handleDelete = async () => {
		if (!me) {
			toast.error("User information is not available");
			return;
		}
		try {
			await deleteConversation({ conversationId: conversation._id, userId: me._id });
			setSelectedConversation(null);
		} catch (err) {
			toast.error("Failed to delete conversation");
		}
	};

    return (
        <>
            <div
                className={`flex gap-2 items-center p-3 hover:bg-chat-hover cursor-pointer
                    ${activeBgClass ? "bg-gray-tertiary" : ""}
                `}
                onClick={() => setSelectedConversation(conversation)}
            >
                <Avatar className='border border-gray-900 overflow-visible relative'>
                    {conversation.isOnline && (
                        <div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-foreground' />
                    )}
                    <AvatarImage src={conversationImage || "/placeholder.png"} className='object-cover rounded-full' />
                    <AvatarFallback>
                        <div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
                    </AvatarFallback>
                </Avatar>
                <div className='w-full'>
                    <div className='flex items-center'>
                        <h3 className='text-sm font-medium'>{conversationName}</h3>
                        <span className='text-xs text-gray-500 ml-auto'>
                            {formatDate(lastMessage?._creationTime || conversation._creationTime)}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }} className='ml-2'>
                            <Trash size={16} />
                        </button>
                    </div>
                    <p className='text-[12px] mt-1 text-gray-500 flex items-center gap-1 '>
                        {lastMessage?.sender === me?._id ? <MessageSeenSvg /> : ""}
                        {conversation.isGroup && <Users size={16} />}
                        {!lastMessage && "Say Hi!"}
                        {lastMessageType === "text" ? (
                            lastMessage?.content.length > 30 ? (
                                <span>{lastMessage?.content.slice(0, 30)}...</span>
                            ) : (
                                <span>{lastMessage?.content}</span>
                            )
                        ) : null}
                        {lastMessageType === "image" && <ImageIcon size={16} />}
                        {lastMessageType === "video" && <VideoIcon size={16} />}
                    </p>
                </div>
            </div>
            <hr className='h-[1px] mx-10 bg-gray-primary' />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        Are you sure you want to delete this conversation?
                    </DialogDescription>
                    <div className='flex justify-end gap-4 mt-4'>
                        <button onClick={() => setIsDialogOpen(false)} className='px-4 py-2 bg-white border rounded'>
                            No
                        </button>
                        <button onClick={() => { handleDelete(); setIsDialogOpen(false); }} className='px-4 py-2 bg-red-500 text-white rounded'>
                            Yes
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Conversation;