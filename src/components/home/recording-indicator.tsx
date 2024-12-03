import { useState } from "react";
import { Pause, Play, StopCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";

interface RecordingIndicatorProps {
  onStop: () => void;
  onPause: () => void;
  onSend: () => void;
  isPaused: boolean;
  audioBlob: Blob;
}

const RecordingIndicator = ({ onStop, onPause, onSend, isPaused, audioBlob }: RecordingIndicatorProps) => {
  const [showPreview, setShowPreview] = useState(false);

  const handleStop = () => {
    onStop();
    setShowPreview(true);
  };

  return (
    <>
      <div className="absolute bottom-16 left-0 right-0 mx-auto w-fit bg-[#0c1524] p-3 rounded-lg shadow-lg flex items-center gap-4 border">
        <div className={`${isPaused ? '' : 'animate-pulse'} bg-red-500 w-3 h-3 rounded-full`} />
        <p className="text-sm text-gray-300">{isPaused ? 'Paused' : 'Recording...'}</p>
        <Button
          onClick={onPause}
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-transparent text-gray-300"
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </Button>
        <Button 
          onClick={handleStop} 
          variant="ghost" 
          size="sm" 
          className="text-red-500"
        >
          <StopCircle size={16} className="mr-2" />
          Stop
        </Button>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col gap-4 items-center">
            <h3 className="text-lg font-medium">Preview Voice Message</h3>
            <audio controls className="w-full" src={URL.createObjectURL(audioBlob)} />
            <div className="flex gap-2 w-full">
              <Button 
                variant="ghost" 
                onClick={() => setShowPreview(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  onSend();
                  setShowPreview(false);
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

export default RecordingIndicator;