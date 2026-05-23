// Full-screen video call overlay. Renders remote stream large + local PiP.
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoCall } from "@/hooks/useVideoCall";

interface VideoCallOverlayProps {
  conversationId: string;
  localUserId: string;
  remoteUserId: string;
  remoteName: string;
  remoteAvatar: string;
  onClose: () => void;
  autoStart?: boolean;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export function VideoCallOverlay({
  conversationId, localUserId, remoteUserId, remoteName, remoteAvatar, onClose, autoStart,
}: VideoCallOverlayProps) {
  const call = useVideoCall(conversationId, localUserId, "video");
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (autoStart && !started.current && call.callStatus === "idle") {
      started.current = true;
      void call.initiateCall(remoteUserId);
    }
  }, [autoStart, call, remoteUserId]);

  useEffect(() => {
    if (localRef.current && call.localStream) localRef.current.srcObject = call.localStream;
  }, [call.localStream]);
  useEffect(() => {
    if (remoteRef.current && call.remoteStream) remoteRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  useEffect(() => {
    if (call.callStatus === "ended" || call.callStatus === "idle") {
      const t = setTimeout(onClose, 600);
      return () => clearTimeout(t);
    }
  }, [call.callStatus, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col"
    >
      <div className="flex-1 relative">
        <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover bg-zinc-900" />
        {(!call.remoteStream || call.callStatus !== "active") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900/80">
            <img src={remoteAvatar} alt={remoteName} className="w-24 h-24 rounded-2xl ring-4 ring-white/10" />
            <div className="text-center text-white">
              <p className="text-xl font-semibold">{remoteName}</p>
              <p className="text-sm text-white/60 mt-1 capitalize">
                {call.callStatus === "calling" ? "Calling…" :
                 call.callStatus === "ringing" ? "Incoming video call" :
                 call.callStatus === "ended" ? "Call ended" : "Connecting…"}
              </p>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
          <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-xs font-medium">
            {call.callStatus === "active" ? formatDuration(call.callDuration) : remoteName}
          </div>
        </div>

        {call.localStream && (
          <video ref={localRef} autoPlay playsInline muted
            className="absolute bottom-32 right-4 w-28 h-40 rounded-2xl object-cover ring-2 ring-white/20 bg-black" />
        )}
      </div>

      <div className="px-6 py-6 bg-zinc-950 flex items-center justify-center gap-3">
        {call.callStatus === "ringing" ? (
          <>
            <Button size="icon" variant="destructive" className="h-14 w-14 rounded-full" onClick={call.rejectIncomingCall}>
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button size="icon" className="h-14 w-14 rounded-full bg-success hover:bg-success/90" onClick={call.acceptIncomingCall}>
              <VideoIcon className="w-6 h-6" />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={call.toggleMuteAudio}>
              {call.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={call.toggleCameraOff}>
              {call.isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </Button>
            <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full" onClick={call.switchCameraFacing}>
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="destructive" className="h-14 w-14 rounded-full" onClick={() => { call.hangUp(); onClose(); }}>
              <PhoneOff className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

interface VoiceCallOverlayProps {
  conversationId: string;
  localUserId: string;
  remoteUserId: string;
  remoteName: string;
  remoteAvatar: string;
  onClose: () => void;
  autoStart?: boolean;
}

// Voice-only overlay — same flow, no video surfaces. Uses useVideoCall in audio mode
// directly to share state and avoid double-mounting the signaling listener.
export function VoiceCallOverlay({
  conversationId, localUserId, remoteUserId, remoteName, remoteAvatar, onClose, autoStart,
}: VoiceCallOverlayProps) {
  const call = useVideoCall(conversationId, localUserId, "audio");
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (autoStart && !started.current && call.callStatus === "idle") {
      started.current = true;
      void call.initiateCall(remoteUserId);
    }
  }, [autoStart, call, remoteUserId]);

  useEffect(() => {
    if (remoteAudioRef.current && call.remoteStream) remoteAudioRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  useEffect(() => {
    if (call.callStatus === "ended" || call.callStatus === "idle") {
      const t = setTimeout(onClose, 600);
      return () => clearTimeout(t);
    }
  }, [call.callStatus, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-between py-12
                 bg-gradient-to-b from-primary/90 via-primary to-primary/80 text-primary-foreground"
    >
      <audio ref={remoteAudioRef} autoPlay />
      <div className="flex flex-col items-center gap-4 mt-12">
        <p className="text-sm uppercase tracking-widest text-primary-foreground/70 font-medium">
          {call.callStatus === "calling" ? "Calling" :
           call.callStatus === "ringing" ? "Incoming call" :
           call.callStatus === "active" ? "On call" :
           call.callStatus === "ended" ? "Call ended" : "Connecting"}
        </p>
        <motion.img
          src={remoteAvatar} alt={remoteName}
          animate={call.callStatus === "calling" || call.callStatus === "ringing"
            ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="w-36 h-36 rounded-3xl ring-4 ring-white/20 shadow-2xl"
        />
        <p className="text-3xl font-display font-semibold">{remoteName}</p>
        {call.callStatus === "active" && (
          <p className="text-base text-primary-foreground/80 tabular-nums">{formatDuration(call.callDuration)}</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        {call.callStatus === "ringing" ? (
          <>
            <Button size="icon" variant="destructive" className="h-16 w-16 rounded-full" onClick={call.rejectIncomingCall}>
              <PhoneOff className="w-7 h-7" />
            </Button>
            <Button size="icon" className="h-16 w-16 rounded-full bg-success hover:bg-success/90" onClick={call.acceptIncomingCall}>
              <Mic className="w-7 h-7" />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full" onClick={call.toggleMuteAudio}>
              {call.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            <Button size="icon" variant="destructive" className="h-16 w-16 rounded-full" onClick={() => { call.hangUp(); onClose(); }}>
              <PhoneOff className="w-7 h-7" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export { AnimatePresence };
