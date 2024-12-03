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
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);

	const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);

	const handleStartRecording = async () => {
		setIsRecording(true);
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const mediaRecorder = new MediaRecorder(stream);
		mediaRecorderRef.current = mediaRecorder;

		mediaRecorder.ondataavailable = (event) => {
			setAudioChunks((prev) => [...prev, event.data]);
		};

		mediaRecorder.start();
	};

	const handleStopRecording = () => {
		mediaRecorderRef.current?.stop();
		setIsRecording(false);
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

				recognition.onresult = (event: Event) => {
					const speechEvent = event as SpeechRecognitionEvent;
					const current = speechEvent.resultIndex;
					const transcript = speechEvent.results[current][0].transcript;
					const currentMessage = msgText || "";

					if (speechEvent.results[current].isFinal) {
						setMsgText(currentMessage + transcript + " ");
					}
				};

				recognition.onerror = (event: Event) => {
					const errorEvent = event as SpeechRecognitionErrorEvent;
					console.log('Speech recognition error: ', errorEvent.error);
					setIsListening(false);

					switch (errorEvent.error) {
						case 'not-allowed':
							toast.error("Microphone access denied. Please allow microphone access.");
							setHasMicPermission(false);
							break;
						case 'no-speech':
							toast.error("No speech detected. Please try again.");
							break;
						case 'network':
							toast.error("Network error. Please check your connection.");
							break;
						default:
							toast("Speech recognition error. Please try again.", {
								icon: '⚠️',
							});
					}
				};

				recognition.onend = () => {
					setIsListening(false);
					toast("Stopped listening", {
						icon: 'ℹ️',
					});
				};

				checkMicrophonePermission();
			}
		}
	}, []);

	const toggleListening = async () => {
		if (!recognitionRef.current) return;
	  
		if (isListening) {
		  recognitionRef.current.stop();
		} else {
		  if (hasMicPermission === false) {
			toast.error(
			  "Microphone access denied. Please allow access in browser settings."
			);
	  
			toast("To enable the microphone: Click the camera/microphone icon in the browser address bar and allow access", {
			  icon: 'ℹ️',
			  duration: 5000,
			});
	  
			return;
		  }
	  
		  try {
			await checkMicrophonePermission();
	  
			if (hasMicPermission) {
			  recognitionRef.current.start();
			}
		  } catch (error) {
			console.log('Error starting speech recognition ', error);
			toast.error("Unable to start speech recognition. Please try again.");
		  }
		}
	  };

	const handleSendTextMsg = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await sendTextMsg({ content: msgText, conversation: selectedConversation!._id, sender: me!._id });
			setMsgText("");
		} catch (err: any) {
			toast.error(err.message);
			console.error(err);
		}
	};

	useEffect(() => {
		// Lắng nghe event pause/resume
		const handlePauseResume = () => {
			if (mediaRecorderRef.current) {
				if (mediaRecorderRef.current.state === "recording") {
					mediaRecorderRef.current.pause();
				} else if (mediaRecorderRef.current.state === "paused") {
					mediaRecorderRef.current.resume();
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
                        className={`transition-colors ${isListening ? "text-red-500" : hasMicPermission === false ? "text-gray-400" : ""}`}
                    >
                        <Mic className={"h-6 w-6 " + (isListening ? " animate-pulse" : "")} />
                    </Button>
                    {msgText.length > 0 ? (
                        <Button
                            type='submit'
                            size={"sm"}
                            className='bg-transparent text-foreground hover:bg-transparent'
                        >
                            <Send />
                        </Button>
                    ) : (
                        <Button
                            type='submit'
                            size={"sm"}
                            className='bg-transparent text-foreground hover:bg-transparent'
                        >
                            {/* Remove duplicate microphone icon */}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};
export default MessageInput;