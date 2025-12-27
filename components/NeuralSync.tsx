
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Zap, X, Loader2, Waves, ShieldCheck, User, Phone, CheckCircle2, Play, Square, Info } from 'lucide-react';
import { mockBackend } from '../services/mockBackend';

const NeuralSync: React.FC = () => {
  const [status, setStatus] = useState<'IDLE' | 'COUNTDOWN' | 'RECORDING' | 'FORM' | 'SUCCESS'>('IDLE');
  const [countdown, setCountdown] = useState(3);
  const [recordTime, setRecordTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isHovered && status === 'IDLE') {
      setStatus('COUNTDOWN');
      setCountdown(3);
      timerRef.current = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isHovered && status === 'COUNTDOWN') {
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus('IDLE');
    }
  }, [isHovered]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);
        setAudioBase64(base64);
        setStatus('FORM');
      };

      mediaRecorder.start();
      setStatus('RECORDING');
      setRecordTime(0);
      
      recordIntervalRef.current = window.setInterval(() => {
        setRecordTime(prev => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic access denied", err);
      setStatus('IDLE');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = mockBackend.getCurrentSessionId();
    const user = mockBackend.getCurrentUser();
    
    mockBackend.saveNeuralComm({
        userId,
        name: formData.name || user?.name || 'Visitor',
        phone: formData.phone || user?.phone || '---',
        audioBlobUrl: audioBase64 || undefined,
        duration: recordTime,
        location: user?.location || { city: 'Unknown', country: 'Global', lat: 0, lng: 0, flag: '' }
    });

    setStatus('SUCCESS');
    setTimeout(() => {
        setStatus('IDLE');
        setAudioBase64(null);
        setFormData({ name: '', phone: '' });
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-10 mb-24 relative z-50">
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="glass-panel rounded-[2rem] sm:rounded-[4rem] p-8 sm:p-16 border border-white/10 relative overflow-hidden group transition-all duration-500 hover:border-cyan-500/30"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-50 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          
          <div className="flex-1 space-y-6 text-left">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Founder Connection</span>
             </div>
             <div>
                <h3 className="text-2xl sm:text-4xl md:text-5xl font-black text-white italic tracking-tighter mb-2 leading-tight">
                  let me know , if you want to be a part of <span className="text-cyan-500">ed-revolution</span> and why?
                </h3>
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.4em]">Direct Uplink to Aman Kumar Singh</p>
             </div>
             <p className="text-gray-400 max-w-md text-sm sm:text-lg font-light leading-relaxed italic">
               "We aren't just building a tool; we're establishing a foundation for the next generation. My vision is to eliminate the memory-based cycle and replace it with application and synthesis."
             </p>
             <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-600">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-500" /> Secure Connection</span>
                <span className="flex items-center gap-2"><Waves className="w-4 h-4 text-purple-500" /> Voice Verification</span>
             </div>
          </div>

          <div className="w-full md:w-[400px] flex flex-col items-center justify-center min-h-[300px] bg-black/40 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative">
             
             {status === 'IDLE' && (
                <div className="text-center animate-in fade-in duration-500">
                   <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Mic className="w-8 h-8 text-gray-400 group-hover:text-cyan-400" />
                   </div>
                   <h4 className="text-white font-bold uppercase tracking-widest mb-2">Hover to Connect</h4>
                   <p className="text-gray-500 text-[10px] uppercase leading-relaxed max-w-[200px] mx-auto">Keep your cursor here to start a 30 second secure audio message to Aman.</p>
                </div>
             )}

             {status === 'COUNTDOWN' && (
                <div className="text-center">
                   <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 flex items-center justify-center mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-cyan-500 rounded-full animate-[ping_1s_infinite] opacity-20"></div>
                      <span className="text-5xl font-black text-cyan-400 italic">{countdown}</span>
                   </div>
                   <p className="text-cyan-400/80 font-black uppercase tracking-widest text-xs">Connecting...</p>
                </div>
             )}

             {status === 'RECORDING' && (
                <div className="text-center w-full">
                   <div className="flex items-end justify-center gap-1 mb-8 h-12">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-1.5 bg-red-500 rounded-full animate-wave" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }}></div>
                      ))}
                   </div>
                   <div className="text-4xl font-mono text-red-500 font-bold mb-4">00:{recordTime.toString().padStart(2, '0')}</div>
                   <button 
                     onClick={stopRecording}
                     className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-red-900/40 flex items-center gap-2 mx-auto"
                   >
                     <Square className="w-3 h-3 fill-current" /> Stop and Send
                   </button>
                   <p className="text-gray-500 text-[9px] uppercase tracking-widest mt-6">Recording in progress (Max 30 seconds)</p>
                </div>
             )}

             {status === 'FORM' && (
                <form onSubmit={handleSubmit} className="w-full space-y-4 animate-in slide-in-from-bottom-4">
                   <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 text-green-400 text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                         <CheckCircle2 className="w-3 h-3" /> Audio Captured
                      </div>
                   </div>
                   <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="text" placeholder="Name (Optional)" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-cyan-500/50 text-xs" 
                      />
                   </div>
                   <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="tel" placeholder="Phone (Optional)" 
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-cyan-500/50 text-xs" 
                      />
                   </div>
                   <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95">
                      Submit Message
                   </button>
                   <button type="button" onClick={() => setStatus('IDLE')} className="w-full py-2 text-gray-600 hover:text-gray-400 font-bold uppercase text-[8px] tracking-widest">Cancel</button>
                </form>
             )}

             {status === 'SUCCESS' && (
                <div className="text-center animate-in zoom-in-95">
                   <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                      <ShieldCheck className="w-10 h-10 text-green-500" />
                   </div>
                   <h4 className="text-white font-black uppercase tracking-tighter text-xl italic">Message Received</h4>
                   <p className="text-gray-500 text-[10px] uppercase mt-2 tracking-widest leading-relaxed">Your voice message has been received. Aman will review your message shortly.</p>
                </div>
             )}
          </div>

        </div>
      </div>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.5); }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>
    </div>
  );
};

export default NeuralSync;
