import * as React from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm }: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-primary dark:bg-gray-tertiary">
        <DialogTitle className="text-foreground">Confirm Deletion</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Are you sure you want to delete this conversation?
        </DialogDescription>
        <div className="flex justify-end gap-3 mt-4">
          <Button 
            variant="outline"
            onClick={onClose}
            className="w-24 bg-white dark:bg-gray-800 text-black dark:text-white 
              hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            No
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
            className="w-24"
          >
            Yes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmDialog; 