import { Id } from "../../../convex/_generated/dataModel";
import { Laugh, Mic, Plus, Send } from "lucide-react";
import { Input } from "../ui/input";
import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConversationStore } from "@/store/chat-store";
import toast from "react-hot-toast";
import useComponentVisible from "@/hooks/useComponentVisible";
import EmojiPicker, { Theme } from "emoji-picker-react";
import MediaDropdown from "./media-dropdown";
import RecordingIndicator from "./recording-indicator";

declare global {
	interface Window {
		SpeechRecognition: any;
		webkitSpeechRecognition: any;
	}
}
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

const MessageInput = () => {
	const [msgText, setMsgText] = useState("");
	const [isListening, setIsListening] = useState(false);
	const [speechSupported, setSpeechSupported] = useState(false);
	const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
	const recognitionRef = useRef<SpeechRecognition | null>(null);

	const { selectedConversation } = useConversationStore();
	const { ref, isComponentVisible, setIsComponentVisible } = useComponentVisible(false);

	const me = useQuery(api.users.getMe);
	const sendTextMsg = useMutation(api.messages.sendTextMessage);
	const sendAudioMsg = useMutation(api.messages.sendAudio);
	const [isRecording, setIsRecording] = useState(false);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const mediaRecorder = useRef<MediaRecorder | null>(null);

	const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder.current = new MediaRecorder(stream);
			
			mediaRecorder.current.ondataavailable = (e) => {
				if (e.data.size > 0) {
					setAudioChunks((chunks) => [...chunks, e.data]);
				}
			};

			mediaRecorder.current.start();
			setIsRecording(true);
		} catch (err) {
			console.error("Error accessing microphone:", err);
		}
	};

	const stopRecording = () => {
		if (mediaRecorder.current) {
			mediaRecorder.current.stop();
			setIsRecording(false);
			// Handle the recorded audio...
		}
	};

	const handleSendAudio = async () => {
		const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });

		try {
			const audioId = await uploadAudio(audioBlob);

			await sendAudioMsg({
				audioId,
				conversation: selectedConversation!._id,
				sender: me!._id
			});

			console.log("Audio sent with ID:", audioId);
		} catch (err: any) {
			toast.error(err.message);
			console.error(err);
		}
		setAudioChunks([]);
	};

	const uploadAudio = async (audioBlob: Blob): Promise<Id<"_storage">> => {
		const postUrl = await generateUploadUrl();
		const result = await fetch(postUrl, {
			method: "POST",
			headers: { "Content-Type": "audio/mpeg" },
			body: audioBlob,
		});
		const { storageId } = await result.json();
		return storageId;
	};

	const checkMicrophonePermission = async () => {
		try {
			const permissionResult = await navigator.mediaDevices.getUserMedia({ audio: true });
			setHasMicPermission(true);
			permissionResult.getTracks().forEach(track => track.stop());
		} catch (error) {
			setHasMicPermission(false);
			console.log("Microphone permissions error", error);
		}
	};

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

			if (SpeechRecognition) {
				setSpeechSupported(true);
				recognitionRef.current = new SpeechRecognition();
				const recognition = recognitionRef.current;

				recognition.continuous = true;
				recognition.interimResults = true;
				recognition.lang = "vi-VN";

				recognition.onstart = () => {
					setIsListening(true);
					toast.success("Listening started");
				};

				recognition.onresult = (event: SpeechRecognitionEvent) => {
					const current = event.resultIndex;
					const transcript = event.results[current][0].transcript;

					if (event.results[current].isFinal) {
						setMsgText((prev) => prev + transcript + " ");
					}
				};

				recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
					console.error('Speech recognition error:', event.error);
					setIsListening(false);
					 toast("Speech recognition error", { icon: '⚠️' });
				};

				recognition.onend = () => {
					setIsListening(false);
					toast("Stopped listening", { icon: 'ℹ️' });
				};
			}
		}
	}, []);

	const toggleListening = () => {
		if (!recognitionRef.current) return;

		if (isListening) {
			recognitionRef.current.stop();
		} else {
			recognitionRef.current.start();
		}
	};

	const handleSendTextMsg = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!msgText.trim() || !selectedConversation || !me) return;

		try {
			await sendTextMsg({
				content: msgText,
				conversation: selectedConversation._id,
				sender: me._id
			});
			setMsgText("");
		} catch (error) {
			console.error("Error sending message:", error);
			toast.error("Failed to send message");
		}
	};

	useEffect(() => {
		const handlePauseResume = () => {
			if (mediaRecorder.current) {
				if (mediaRecorder.current.state === "recording") {
					mediaRecorder.current.pause();
				} else if (mediaRecorder.current.state === "paused") {
					mediaRecorder.current.resume();
				}
			}
		};

		window.addEventListener('voice-recording-pause-resume', handlePauseResume);
		return () => {
			window.removeEventListener('voice-recording-pause-resume', handlePauseResume);
		};
	}, []);

	return (
        <div className='bg-gray-primary p-2 flex gap-4 items-center'>
            <div className='relative flex gap-2 ml-2'>
                <div ref={ref} onClick={() => setIsComponentVisible(true)}>
                    {isComponentVisible && (
                        <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(emojiObject) => {
                                setMsgText((prev) => prev + emojiObject.emoji);
                            }}
                            style={{ position: "absolute", bottom: "1.5rem", left: "1rem", zIndex: 50 }}
                        />
                    )}
                    <Laugh className='text-gray-600 dark:text-gray-400' />
                </div>
                <MediaDropdown />
            </div>
            <form onSubmit={handleSendTextMsg} className='w-full flex gap-3'>
                <div className='flex-1'>
                    <Input
                        type='text'
                        placeholder='Enter message'
                        className='py-2 text-sm w-full rounded-lg shadow-sm bg-gray-tertiary focus-visible:ring-transparent'
                        value={msgText}
                        onChange={(e) => setMsgText(e.target.value)}
                    />
                </div>
                <div className='mr-4 flex items-center gap-3'>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleListening}
                        className={`transition-colors ${isListening ? "text-blue-500" : ""}`}
                        title="Voice-to-text"
                    >
                        <Mic className={isListening ? "text-blue-500" : ""} />
                    </Button>

                    {msgText.length > 0 && (
                        <Button
                            type='button'
                            size={"sm"}
                            className='bg-transparent text-foreground hover:bg-transparent'
                            onClick={handleSendTextMsg}
                        >
                            <Send />
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};
export default MessageInput;