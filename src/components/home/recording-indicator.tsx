import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "../ui/button";

const RecordingIndicator = ({ onStop, onSend }: { onStop: () => void; onSend: () => void }) => {
    const [isRecording, setIsRecording] = useState(true);
    const [isPaused, setIsPaused] = useState(false);

    const handleStop = () => {
        setIsRecording(false);
        onStop();
    };

    const handlePauseResume = () => {
        setIsPaused(!isPaused);
        // Gửi event để MediaRecorder pause/resume
        window.dispatchEvent(new CustomEvent('voice-recording-pause-resume'));
    };

    return (
        <div className="fixed bottom-10 right-10 bg-white p-4 rounded shadow-lg flex items-center gap-4">
            {isRecording ? (
                <>
                    <div className={`${isPaused ? '' : 'animate-pulse'} bg-red-500 w-3 h-3 rounded-full`}></div>
                    <p>{isPaused ? 'Paused' : 'Recording...'}</p>
                    <Button
                        onClick={handlePauseResume}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                    >
                        {isPaused ? <Play size={20} /> : <Pause size={20} />}
                    </Button>
                    <Button
                        onClick={handleStop}
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                    >
                        Stop
                    </Button>
                </>
            ) : (
                <div>
                    <audio controls>
                        <source src="audio-url" type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                    <Button
                        onClick={onSend}
                        className="bg-blue-500 text-white px-3 py-1 rounded mt-2"
                    >
                        Send
                    </Button>
                </div>
            )}
        </div>
    );
};

export default RecordingIndicator;