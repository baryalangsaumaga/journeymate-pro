/**
 * useVoiceCall — audio-only variant of useVideoCall.
 * Reuses the same signaling service but forces mode="audio" and omits
 * camera controls. State machine identical: idle → calling → ringing → active → ended.
 */
import { useCallback } from "react";
import { useVideoCall } from "./useVideoCall";

export interface UseVoiceCallReturn {
  callStatus: "idle" | "calling" | "ringing" | "active" | "ended";
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingCall: { from: string; conversationId: string } | null;
  isMuted: boolean;
  callDuration: number;
  initiateCall: (remoteUserId: string) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  hangUp: () => void;
  toggleMuteAudio: () => void;
}

export function useVoiceCall(
  conversationId: string,
  localUserId: string | undefined,
): UseVoiceCallReturn {
  const v = useVideoCall(conversationId, localUserId, "audio");

  // Surface a slimmer incomingCall shape (no offerSdp/mode plumbing leaks).
  const incomingCall = v.incomingCall
    ? { from: v.incomingCall.from, conversationId: v.incomingCall.conversationId }
    : null;

  const initiateCall = useCallback((remoteUserId: string) => v.initiateCall(remoteUserId), [v]);

  return {
    callStatus: v.callStatus,
    localStream: v.localStream,
    remoteStream: v.remoteStream,
    incomingCall,
    isMuted: v.isMuted,
    callDuration: v.callDuration,
    initiateCall,
    acceptIncomingCall: v.acceptIncomingCall,
    rejectIncomingCall: v.rejectIncomingCall,
    hangUp: v.hangUp,
    toggleMuteAudio: v.toggleMuteAudio,
  };
}
