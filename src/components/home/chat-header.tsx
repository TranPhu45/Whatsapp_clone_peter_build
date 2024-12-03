import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import toast from "react-hot-toast";
import DeleteConfirmDialog from "./delete-conversation-dialog";
import { Conversation } from "@/store/chat-store";
import { Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface ChatHeaderProps {
  conversation: Conversation;
}

const ChatHeader = ({ conversation }: ChatHeaderProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteConversation = useMutation(api.conversations.deleteConversation);

  const handleConfirmDelete = async () => {
    try {
      await deleteConversation({ id: conversation._id });
      setShowDeleteDialog(false);
      toast.success("Conversation deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete conversation");
    }
  };

  return (
    <div className="p-4 flex items-center justify-between border-b">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={conversation.image} />
          <AvatarFallback>
            {conversation.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{conversation.name}</h3>
          {conversation.isGroup && (
            <p className="text-sm text-gray-500">
              {conversation.participants.length} members
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Video className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => setShowDeleteDialog(true)}
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ChatHeader; 