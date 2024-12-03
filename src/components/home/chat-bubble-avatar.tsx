import { IMessage } from "@/store/chat-store";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

type ChatBubbleAvatarProps = {
	message: IMessage;
	isMember: boolean;
	isGroup: boolean | undefined;
	fromAI: boolean;
};

const ChatBubbleAvatar = ({ isGroup, isMember, message, fromAI }: ChatBubbleAvatarProps) => {
	if (!isGroup && !fromAI) return null;

	return (
		<Avatar className='overflow-visible relative'>
			{message.sender.isOnline && isMember && (
				<div className='absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-foreground' />
			)}
			<AvatarImage src={message.sender?.image} className='rounded-full object-cover w-8 h-8' />
			<AvatarFallback className='w-8 h-8 '>
				<div className='animate-pulse bg-gray-tertiary rounded-full'></div>
			</AvatarFallback>
		</Avatar>
	);
};

type DeleteConfirmDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

// const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm }: DeleteConfirmDialogProps) => {
// 	return (
// 		<Dialog open={isOpen} onOpenChange={onClose}>
// 			<DialogContent className="sm:max-w-[425px]">
// 				<DialogTitle>Confirm Deletion</DialogTitle>
// 				<DialogDescription>
// 					Are you sure you want to delete this conversation?
// 				</DialogDescription>
// 				<div className="flex justify-end gap-3 mt-4">
// 					<Button 
// 						variant="ghost" 
// 						onClick={onClose}
// 					>
// 						No
// 					</Button>
// 					<Button 
// 						variant="destructive"
// 						onClick={onConfirm}
// 					>
// 						Yes
// 					</Button>
// 				</div>
// 			</DialogContent>
// 		</Dialog>
// 	);
// };

export default ChatBubbleAvatar;
