import { useEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ImageIcon, Paperclip, Plus, Video, Mic } from "lucide-react";
import { Dialog, DialogContent, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import Image from "next/image";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConversationStore } from "@/store/chat-store";
import RecordingIndicator from "./recording-indicator";

interface MediaDropdownProps {
  startRecording?: () => void;
}

const MediaDropdown = ({ startRecording }: MediaDropdownProps) => {
    const imageInput = useRef<HTMLInputElement>(null);
    const videoInput = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);

    const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
    const sendImage = useMutation(api.messages.sendImage);
    const sendVideo = useMutation(api.messages.sendVideo);
    const sendAudio = useMutation(api.messages.sendAudio);
    const me = useQuery(api.users.getMe);

    const { selectedConversation } = useConversationStore();

    const fileInput = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const sendFile = useMutation(api.messages.sendFile);

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);

    const handleSendImage = async () => {
        setIsLoading(true);
        try {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": selectedImage!.type },
                body: selectedImage,
            });

            const { storageId } = await result.json();
            await sendImage({
                conversation: selectedConversation!._id,
                imgId: storageId,
                sender: me!._id,
            });

            setSelectedImage(null);
        } catch (err) {
            toast.error("Failed to send image");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendVideo = async () => {
        setIsLoading(true);
        try {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": selectedVideo!.type },
                body: selectedVideo,
            });

            const { storageId } = await result.json();

            await sendVideo({
                videoId: storageId,
                conversation: selectedConversation!._id,
                sender: me!._id,
            });

            setSelectedVideo(null);
        } catch (error) {
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendFile = async () => {
		setIsLoading(true);
		try {
			if (!selectedFile) {
				toast.error("No file selected");
				return;
			}
	
			console.log("Generating upload URL...");
			const postUrl = await generateUploadUrl();
			console.log("Upload URL:", postUrl);
	
			console.log("Selected file:", selectedFile);
			const result = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": selectedFile.type },
				body: selectedFile,
			});
	
			const { storageId } = await result.json();
			console.log("Storage ID:", storageId);
	
			await sendFile({
				fileId: storageId,
				conversation: selectedConversation!._id,
				sender: me!._id,
				fileName: selectedFile.name,
			});
			setSelectedFile(null);
		} catch (error) {
			console.error("Error sending file:", error);
			toast.error("Failed to send file");
		} finally {
			setIsLoading(false);
		}
	};

    const handleStopRecording = () => {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    const blob = new Blob([e.data], { type: 'audio/mpeg' });
                    setPreviewBlob(blob);
                    setShowPreviewDialog(true);
                }
            };
            setIsRecording(false);
            setIsPaused(false);
        }
    };

    const handleSendRecording = async () => {
        if (previewBlob) {
            try {
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": "audio/mpeg" },
                    body: previewBlob
                });

                const { storageId } = await result.json();
                await sendAudio({
                    audioId: storageId,
                    conversation: selectedConversation!._id,
                    sender: me!._id,
                });

                toast.success("Voice message sent!");
                setPreviewBlob(null);
            } catch (err) {
                console.error(err);
                toast.error("Failed to send voice message");
            }
        }
    };

    const handlePauseResume = () => {
        if (!mediaRecorder.current) return;

        if (isPaused) {
            mediaRecorder.current.resume();
        } else {
            mediaRecorder.current.pause();
        }
        setIsPaused(!isPaused);
    };

    const handleSendAudio = async () => {
        if (audioBlob) {
            try {
                // Upload audio blob
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": "audio/mpeg" },
                    body: audioBlob,
                });

                const { storageId } = await result.json();

                // Send message
                await sendAudio({
                    audioId: storageId,
                    conversation: selectedConversation!._id,
                    sender: me!._id,
                });

                // Cleanup
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }
                setAudioBlob(null);
                setAudioUrl(null);
                
                toast.success("Voice message sent!");
            } catch (err) {
                console.error(err);
                toast.error("Failed to send voice message");
            }
        }
    };

    const handleStartRecording = async () => {
        audioChunks.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.current.push(e.data);
            }
        };

        mediaRecorder.current = recorder;
        recorder.start();
        setIsRecording(true);
    };

    // Cleanup URLs khi component unmount
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    useEffect(() => {
        if (selectedFile) {
            handleSendFile();
        }
    }, [selectedFile]);

    return (
        <>
            <input
                type='file'
                ref={imageInput}
                accept='image/*'
                onChange={(e) => setSelectedImage(e.target.files![0])}
                hidden
            />

            <input
                type='file'
                ref={videoInput}
                accept='video/mp4'
                onChange={(e) => setSelectedVideo(e.target?.files![0])}
                hidden
            />

			<input
				type='file'
				ref={fileInput}
				onChange={(e) => setSelectedFile(e.target.files![0])}
				hidden
			/>

            {selectedImage && (
                <MediaImageDialog
                    isOpen={selectedImage !== null}
                    onClose={() => setSelectedImage(null)}
                    selectedImage={selectedImage}
                    isLoading={isLoading}
                    handleSendImage={handleSendImage}
                />
            )}

            {selectedVideo && (
                <MediaVideoDialog
                    isOpen={selectedVideo !== null}
                    onClose={() => setSelectedVideo(null)}
                    selectedVideo={selectedVideo}
                    isLoading={isLoading}
                    handleSendVideo={handleSendVideo}
                />
            )}

            {audioBlob && (
                <MediaAudioDialog
                    isOpen={audioBlob !== null}
                    onClose={() => setAudioBlob(null)}
                    audioBlob={audioBlob}
                    isLoading={isLoading}
                    handleSendAudio={handleSendAudio}
                />
            )}

            <DropdownMenu>
                <DropdownMenuTrigger>
                    <Plus className='text-gray-600 dark:text-gray-400' />
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => imageInput.current!.click()}>
                        <ImageIcon size={18} className='mr-1' /> Photo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => videoInput.current!.click()}>
                        <Video size={20} className='mr-1' />
                        Video
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInput.current!.click()}>
                        <Paperclip size={20} className='mr-1' />
                        File
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleStartRecording}
                        disabled={isRecording}
                        className={isRecording ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                        <Mic size={20} className='mr-1' />
                        {isRecording ? "Recording" : "Voice Message"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {isRecording && (
                <RecordingIndicator 
                    onStop={handleStopRecording}
                    onPause={handlePauseResume}
                    onSend={handleSendRecording}
                    isPaused={isPaused}
                    audioBlob={previewBlob || new Blob()}
                />
            )}

            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent>
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-medium">Preview Voice Message</h3>
                        {previewBlob && (
                            <audio controls src={URL.createObjectURL(previewBlob)} className="w-full" />
                        )}
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowPreviewDialog(false);
                                    setPreviewBlob(null);
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    handleSendRecording();
                                    setShowPreviewDialog(false);
                                }}
                                className="flex-1"
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MediaDropdown;

type MediaImageDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    selectedImage: File;
    isLoading: boolean;
    handleSendImage: () => void;
};

const MediaImageDialog = ({ isOpen, onClose, selectedImage, isLoading, handleSendImage }: MediaImageDialogProps) => {
    const [renderedImage, setRenderedImage] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedImage) return;
        const reader = new FileReader();
        reader.onload = (e) => setRenderedImage(e.target?.result as string);
        reader.readAsDataURL(selectedImage);
    }, [selectedImage]);

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
        >
            <DialogContent>
                <DialogDescription className='flex flex-col gap-10 justify-center items-center'>
                    {renderedImage && <Image src={renderedImage} width={300} height={300} alt='selected image' />}
                    <Button className='w-full' disabled={isLoading} onClick={handleSendImage}>
                        {isLoading ? "Sending..." : "Send"}
                    </Button>
                </DialogDescription>
            </DialogContent>
        </Dialog>
    );
};

type MediaVideoDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    selectedVideo: File;
    isLoading: boolean;
    handleSendVideo: () => void;
};

const MediaVideoDialog = ({ isOpen, onClose, selectedVideo, isLoading, handleSendVideo }: MediaVideoDialogProps) => {
    const renderedVideo = URL.createObjectURL(new Blob([selectedVideo], { type: "video/mp4" }));

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
        >
            <DialogContent>
                <DialogDescription>Video</DialogDescription>
                <div className='w-full'>
                    {renderedVideo && <ReactPlayer url={renderedVideo} controls width='100%' />}
                </div>
                <Button className='w-full' disabled={isLoading} onClick={handleSendVideo}>
                    {isLoading ? "Sending..." : "Send"}
                </Button>
            </DialogContent>
        </Dialog>
    );
};

type MediaAudioDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    audioBlob: Blob;
    isLoading: boolean;
    handleSendAudio: () => void;
};

const MediaAudioDialog = ({ isOpen, onClose, audioBlob, isLoading, handleSendAudio }: MediaAudioDialogProps) => {
    const audioUrl = URL.createObjectURL(audioBlob);

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
        >
            <DialogContent>
                <DialogDescription>Audio</DialogDescription>
                <audio controls src={audioUrl} />
                <Button className='w-full' disabled={isLoading} onClick={handleSendAudio}>
                    {isLoading ? "Sending..." : "Send"}
                </Button>
            </DialogContent>
        </Dialog>
    );
};