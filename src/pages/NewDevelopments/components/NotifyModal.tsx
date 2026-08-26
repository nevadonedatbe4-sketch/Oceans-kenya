import { useState } from 'react';
import type { DevelopmentGroup } from '@/hooks/useNewDevelopments';

interface NotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  dev: DevelopmentGroup | null;
}

interface NotifySubscription {
  id: string;
  devName: string;
  email: string;
  timestamp: number;
}

function getSubscriptions(): NotifySubscription[] {
  try {
    return JSON.parse(localStorage.getItem('notify_devs') || '[]');
  } catch {
    return [];
  }
}

function saveSubscriptions(subs: NotifySubscription[]) {
  localStorage.setItem('notify_devs', JSON.stringify(subs));
}

export default function NotifyModal({ isOpen, onClose, dev }: NotifyModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !dev) return null;

  const isCompleted = dev.completionDate && (dev.completionDate.toLowerCase() === 'completed' || dev.completionDate.toLowerCase() === 'ready');
  const alreadySubscribed = getSubscriptions().some((s) => s.id === dev.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('idle');
    setErrorMsg('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error');
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const subs = getSubscriptions();
    if (subs.some((s) => s.id === dev.id && s.email === email.trim())) {
      setStatus('error');
      setErrorMsg('You are already subscribed to alerts for this development.');
      return;
    }

    subs.push({
      id: dev.id,
      devName: dev.name,
      email: email.trim(),
      timestamp: Date.now(),
    });

    saveSubscriptions(subs);
    setStatus('success');
    setEmail('');
  }

  function handleClose() {
    setStatus('idle');
    setErrorMsg('');
    setEmail('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-sm max-w-md w-full p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 flex items-center justify-center bg-primary/5 rounded-full">
            <i className="ri-notification-3-line text-primary text-lg"></i>
          </div>
          <div>
            <h3 className="font-prata text-primary text-base">Notify Me</h3>
            <p className="text-stone-400 font-roboto text-xs">Get alerted when this development nears completion</p>
          </div>
        </div>

        {isCompleted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-50 rounded-full mx-auto mb-3">
              <i className="ri-check-double-line text-xl text-emerald-500"></i>
            </div>
            <p className="font-roboto text-primary text-sm font-semibold mb-1">This development is already completed</p>
            <p className="text-stone-400 font-roboto text-xs">No alerts needed — contact the developer directly.</p>
          </div>
        ) : alreadySubscribed && status !== 'success' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 flex items-center justify-center bg-primary/5 rounded-full mx-auto mb-3">
              <i className="ri-mail-check-line text-xl text-primary"></i>
            </div>
            <p className="font-roboto text-primary text-sm font-semibold mb-1">You are subscribed</p>
            <p className="text-stone-400 font-roboto text-xs">We will notify you when {dev.name} nears completion.</p>
          </div>
        ) : status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-50 rounded-full mx-auto mb-3">
              <i className="ri-mail-check-line text-xl text-emerald-500"></i>
            </div>
            <p className="font-roboto text-primary text-sm font-semibold mb-1">Subscription confirmed</p>
            <p className="text-stone-400 font-roboto text-xs mb-4">You will be notified when {dev.name} nears completion.</p>
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-roboto font-medium text-sm tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-primary/90 transition-colors"
            >
              <i className="ri-check-line"></i>Got it
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <p className="font-roboto text-base text-primary mb-3">
                Subscribe to updates for <span className="font-semibold">{dev.name}</span>
              </p>
              <label htmlFor="notify-email" className="block text-sm font-roboto font-semibold text-primary mb-2">
                Email Address
              </label>
              <input
                id="notify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border-2 border-primary/40 rounded-sm px-4 py-3 text-base font-roboto font-normal text-primary placeholder:text-stone-400 focus:outline-none focus:border-primary"
                required
              />
              {status === 'error' && errorMsg && (
                <p className="mt-2 text-red-500 font-roboto text-xs flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  {errorMsg}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-accent text-white font-roboto font-semibold text-base tracking-widest uppercase cursor-pointer whitespace-nowrap transition-colors"
              >
                <i className="ri-notification-3-line"></i>Subscribe
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary/20 text-primary font-roboto text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="mt-3 text-stone-400 font-roboto text-[10px] leading-relaxed">
              We will only email you about this development. You can unsubscribe at any time.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}