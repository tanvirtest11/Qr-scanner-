import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, VideoOff } from 'lucide-react';
import { playClickFeedback, triggerHaptic } from '../utils/qrParser';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CameraErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Camera Scanner Runtime Error Boundary caught:', error, errorInfo);
  }

  public handleForceReset = () => {
    playClickFeedback();
    triggerHaptic(40);
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-40 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
            <VideoOff className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-zinc-100 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Camera Stream Interrupted
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs mb-6 leading-relaxed">
            The camera stream encountered an unexpected hardware or memory glitch. Force resetting will clear all camera memory and re-initialize the video feed.
          </p>

          <button
            id="btn-error-boundary-force-reset"
            type="button"
            onClick={this.handleForceReset}
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Force Reset Camera</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CameraErrorBoundary;
