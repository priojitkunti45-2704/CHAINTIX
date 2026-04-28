import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Ticket as TicketIcon, 
  Wallet as WalletIcon, 
  LayoutGrid, 
  History, 
  Zap, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  ArrowRightLeft,
  Fingerprint,
  Cpu,
  Lock,
  Globe,
  Timer,
  ShieldCheck
} from 'lucide-react';
import { BlockchainExplorer } from './components/BlockchainExplorer';
import { TicketQR } from './components/TicketQR';
import { BlockchainState, Ticket, Event } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [state, setState] = useState<BlockchainState | null>(null);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'tickets' | 'explorer'>('marketplace');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [transferingTicket, setTransferingTicket] = useState<Ticket | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferPrice, setTransferPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  // Initialize Wallet & Identity
  useEffect(() => {
    const savedAddr = localStorage.getItem('chaintix_wallet');
    const savedUser = localStorage.getItem('chaintix_user');
    const savedRecent = localStorage.getItem('chaintix_recent_views');
    
    if (savedAddr && savedUser) {
      setWalletAddress(savedAddr);
      setUsername(savedUser);
      setIsLoggedIn(true);
    }

    if (savedRecent) {
      setRecentlyViewedIds(JSON.parse(savedRecent));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    const newAddr = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    localStorage.setItem('chaintix_wallet', newAddr);
    localStorage.setItem('chaintix_user', username);
    setWalletAddress(newAddr);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('chaintix_wallet');
    localStorage.removeItem('chaintix_user');
    setIsLoggedIn(false);
    setUsername('');
  };

  // Sync Blockchain State
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("[SYNC] Connectivity check...");
        const ping = await fetch('/api/health');
        console.log("[SYNC] Connectivity check status:", ping.status);
        
        console.log("[SYNC] Attempting to reach node...");
        const res = await fetch('/api/blockchain');
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setState(data);
        setError(null); 
        console.log("[SYNC] Success");
      } catch (err) {
        console.error("Sync Error Details:", err);
        const msg = err instanceof TypeError ? "Incompatible Node Connection (Check heartbeat)" : (err instanceof Error ? err.message : "Handshake failed");
        setError(`Blockchain Sync Error: ${msg}`);
      }
    };

    // Initial wait to let server settle
    const timer = setTimeout(fetchData, 2000);
    const interval = setInterval(fetchData, 10000); // 10s interval is fine
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const purchaseTicket = async (eventId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, walletAddress })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTab('tickets');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Purchase failed. Network error.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAtGate = async (ticketId: string) => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSelectedTicket(null);
        setActiveTab('explorer');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Gate verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const transferTicket = async () => {
    if (!transferingTicket) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: transferingTicket.id,
          fromAddress: walletAddress,
          toAddress: transferTarget,
          price: Number(transferPrice)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTransferingTicket(null);
        setActiveTab('explorer');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Transfer failed. Check address and price.");
    } finally {
      setLoading(false);
    }
  };

  const myTickets = state?.tickets.filter(t => t.owner === walletAddress) || [];
  const recentlyViewedTickets = state?.tickets.filter(t => recentlyViewedIds.includes(t.id)) || [];

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setRecentlyViewedIds(prev => {
      const filtered = prev.filter(id => id !== ticket.id);
      const updated = [ticket.id, ...filtered].slice(0, 5);
      localStorage.setItem('chaintix_recent_views', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen font-sans selection:bg-brand-neon selection:text-brand-bg transition-colors">
      <div className="technical-grid fixed inset-0 pointer-events-none opacity-20" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-md border-bottom border-brand-border h-20 flex items-center px-4 md:px-8 border-b">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-neon text-brand-bg rounded animate-pulse">
              <Zap size={24} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase cursor-pointer" onClick={() => setActiveTab('marketplace')}>Chain<span className="text-brand-neon">Tix</span></h1>
            <div className="hidden md:flex ml-4 px-2 py-1 bg-brand-neon/10 border border-brand-neon/30 text-[10px] font-mono rounded text-brand-neon animate-pulse uppercase tracking-[0.2em]">
              Smart Contract Enforced
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isLoggedIn ? (
              <form onSubmit={handleLogin} className="flex items-center gap-3 bg-brand-surface border border-brand-border p-1 pl-4 rounded-full">
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="bg-transparent border-none outline-none font-mono text-xs w-24 md:w-32 py-1"
                />
                <button 
                  type="submit"
                  className="bg-brand-neon text-brand-bg px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                >
                  Sync
                </button>
              </form>
            ) : (
              <>
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-brand-muted uppercase">{username}</span>
                    <div className="w-1.5 h-1.5 bg-brand-neon rounded-full animate-pulse" />
                  </div>
                  <span className="text-[10px] font-mono text-brand-neon opacity-70">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  title="Logout / Disconnect"
                  className="p-3 bg-brand-surface border border-brand-border rounded-full hover:border-red-500/50 group cursor-pointer transition-all"
                >
                  <WalletIcon size={20} className="text-brand-neon group-hover:text-red-500 transition-colors" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-20">
        {/* Error Modal */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-4 text-red-500"
            >
              <ShieldAlert className="shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold uppercase tracking-tight">Access Violation Detected</p>
                <p className="text-xs font-mono opacity-80">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="px-4 py-1 bg-red-500 text-white text-[10px] uppercase font-bold rounded"
              >
                Clear Log
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <nav className="flex gap-4 mb-12 border-b border-brand-border">
          {[
            { id: 'marketplace', icon: LayoutGrid, label: 'Market' },
            { id: 'tickets', icon: TicketIcon, label: 'Vault' },
            { id: 'explorer', icon: History, label: 'Chain' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-4 px-4 flex items-center gap-2 font-black uppercase text-sm tracking-tight transition-all relative overflow-hidden",
                activeTab === tab.id ? "text-brand-neon" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="nav-glow" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-neon glow-neon" />
              )}
            </button>
          ))}
        </nav>

        {/* Defense Dashboard Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'SBT Layer', status: 'Soulbound Mint', icon: Fingerprint },
            { label: 'Cap Layer', status: 'Anti-Scalp Lock', icon: Lock },
            { label: 'Gate Layer', status: 'Smart Entry', icon: Globe },
            { label: 'QR Layer', status: 'Rolling Hash', icon: Timer },
          ].map((layer, i) => (
            <div key={i} className="p-4 bg-brand-surface border border-brand-border rounded-xl flex items-center gap-3">
              <div className="p-2 bg-brand-neon/10 rounded-lg">
                <layer.icon size={16} className="text-brand-neon" />
              </div>
              <div>
                <div className="text-[9px] font-mono text-brand-muted uppercase leading-none mb-1">{layer.label}</div>
                <div className="text-[10px] font-black text-brand-text uppercase tracking-tight">{layer.status}</div>
              </div>
            </div>
          ))}
        </div>

        <section className="min-h-[60vh]">
          {activeTab === 'marketplace' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {state?.events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedEvent(event)}
                  className="group relative bg-brand-surface border border-brand-border rounded-2xl p-6 hover:border-brand-neon/50 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Zap size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-2">
                        <div className="px-3 py-1 bg-brand-neon/10 border border-brand-neon/30 text-[10px] font-mono text-brand-neon uppercase tracking-widest rounded-full w-fit">
                          Live Event
                        </div>
                        {event.isSoulbound && (
                          <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-[10px] font-mono text-purple-400 uppercase tracking-widest rounded-full flex items-center gap-1 w-fit">
                            <Fingerprint size={10} /> Soulbound
                          </div>
                        )}
                      </div>
                      <span className="text-brand-neon font-mono text-xl font-bold">₹{event.price}</span>
                    </div>
                    <h3 className="text-2xl font-black uppercase leading-none mb-2 group-hover:text-brand-neon transition-colors">{event.name}</h3>
                    <p className="text-brand-muted text-xs font-mono uppercase mb-8 flex items-center gap-2">
                       <History size={12} /> {event.date} • {event.venue}
                    </p>
                    <button 
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        purchaseTicket(event.id);
                      }}
                      className="w-full py-4 bg-brand-bg border border-brand-border group-hover:bg-brand-neon group-hover:text-brand-bg transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Mint Ticket"}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="space-y-12">
              {/* Recently Viewed Header */}
              {recentlyViewedTickets.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-brand-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History size={14} className="text-brand-neon" /> Recent Cryptographic Views
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
                    {recentlyViewedTickets.map((t) => (
                      <motion.div
                        key={`recent-${t.id}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => handleSelectTicket(t)}
                        className="min-w-[200px] p-4 bg-brand-surface border border-brand-border rounded-xl hover:border-brand-neon/50 cursor-pointer transition-all flex items-center gap-3 shrink-0"
                      >
                        <div className="p-2 bg-brand-neon/10 rounded-lg">
                          <TicketIcon size={16} className="text-brand-neon" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-brand-muted uppercase truncate">{t.eventName}</div>
                          <div className="text-[11px] font-black text-brand-text truncate">#{t.id.slice(0, 6)}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {!isLoggedIn ? (
                <div className="col-span-full py-20 bg-brand-surface/50 border border-dashed border-brand-border rounded-3xl flex flex-col items-center justify-center text-center">
                  <div className="p-6 bg-brand-bg border border-brand-border rounded-full mb-6 text-brand-muted">
                    <Lock size={48} />
                  </div>
                  <h3 className="text-2xl font-black uppercase mb-2">Authenticated Access Required</h3>
                  <p className="text-brand-muted max-w-sm mb-8">Please sync your agent identity in the upper corner to access your cryptographic vault.</p>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="col-span-full py-20 bg-brand-surface/50 border border-dashed border-brand-border rounded-3xl flex flex-col items-center justify-center text-center">
                  <div className="p-6 bg-brand-bg border border-brand-border rounded-full mb-6 text-brand-muted">
                    <ShieldAlert size={48} />
                  </div>
                  <h3 className="text-2xl font-black uppercase mb-2">Vault Empty</h3>
                  <p className="text-brand-muted max-w-sm mb-8">No tickets detected in your wallet. Head to the market to mint one.</p>
                  <button onClick={() => setActiveTab('marketplace')} className="px-8 py-3 bg-brand-neon text-brand-bg font-black uppercase tracking-widest rounded-full">Buy Tickets</button>
                </div>
              ) : (
                myTickets.map((ticket, i) => (
                  <motion.div
                    key={ticket.id}
                    layoutId={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className="p-6 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-neon cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start mb-12">
                      <div className="flex flex-col gap-2">
                        <div className="p-2 bg-brand-neon/20 rounded w-fit">
                          <TicketIcon className="text-brand-neon" />
                        </div>
                        {ticket.isSoulbound && (
                          <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-[8px] font-mono text-purple-400 uppercase tracking-widest rounded-md flex items-center gap-1">
                            <Fingerprint size={10} /> SBT Locked
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-brand-muted uppercase">Original Value</div>
                        <div className="text-lg font-bold">₹{ticket.originalPrice}</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold uppercase mb-2 line-clamp-1">{ticket.eventName}</h3>
                    <div className="text-[10px] font-mono text-brand-muted uppercase bg-brand-bg px-2 py-1 rounded inline-block">
                      ID: {ticket.id.slice(0, 8)}...
                    </div>
                    <div className="mt-8 flex items-center justify-between">
                      <span className={cn(
                        "text-[10px] uppercase font-bold tracking-widest flex items-center gap-1",
                        ticket.status === 'ACTIVE' ? "text-brand-neon" : 
                        ticket.status === 'USED' ? "text-brand-muted" : "text-red-500"
                      )}>
                        {ticket.status === 'ACTIVE' ? <Zap size={10} fill="currentColor" /> : 
                         ticket.status === 'USED' ? <History size={10} /> : <ShieldAlert size={10} />}
                        {ticket.status}
                      </span>
                      <ChevronRight className="text-brand-muted group-hover:translate-x-2 transition-transform" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

          {activeTab === 'explorer' && (
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <BlockchainExplorer chain={state?.chain || []} />
              </div>
              <div className="space-y-8">
                <div className="p-6 bg-brand-surface border border-brand-border rounded-2xl">
                  <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-brand-neon" /> Node Status
                  </h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-brand-muted uppercase">Protocol</span>
                      <span className="text-brand-neon font-bold">CHAINTIX V1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-muted uppercase">Latency</span>
                      <span>24ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-muted uppercase">Total Tickets</span>
                      <span>{state?.tickets.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-muted uppercase">Chain Height</span>
                      <span>{state?.chain.length}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-brand-neon/10 border border-brand-neon/30 rounded-2xl">
                  <p className="text-[10px] font-mono text-brand-neon uppercase tracking-widest font-bold mb-2">Smart Contract Rule</p>
                  <p className="text-sm font-medium leading-relaxed italic text-brand-neon/80">
                    "All ticket secondary transfers are hard-capped at 110% of original mint value. Attempting to sell higher will result in a Contract Reversion."
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
          </main>

            {/* Event Detail Modal */}
            {selectedEvent && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedEvent(null)}
                  className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" 
                />
                <motion.div 
                  layoutId={`event-${selectedEvent.id}`}
                  className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl"
                >
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           {selectedEvent.isSoulbound && (
                            <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-[8px] font-mono text-purple-400 uppercase tracking-widest rounded flex items-center gap-1">
                              <Fingerprint size={10} /> SBT Locked
                            </div>
                          )}
                          <div className="px-2 py-0.5 bg-brand-neon/10 border border-brand-neon/30 text-[8px] font-mono text-brand-neon uppercase tracking-widest rounded">
                            Verified Event
                          </div>
                        </div>
                        <h2 className="text-3xl font-black uppercase mb-2">{selectedEvent.name}</h2>
                        <div className="flex items-center gap-4 text-brand-muted font-mono text-xs uppercase">
                          <span className="flex items-center gap-1"><History size={14} /> {selectedEvent.date}</span>
                          <span className="flex items-center gap-1"><Globe size={14} /> {selectedEvent.venue}</span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted">
                        <Zap className="rotate-45" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-mono text-brand-muted uppercase mb-2">Mission Parameters</h4>
                          <p className="text-sm leading-relaxed text-brand-text/80">{selectedEvent.description}</p>
                        </div>

                        {selectedEvent.speakers && selectedEvent.speakers.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-mono text-brand-muted uppercase mb-3 text-brand-neon">Confirmed Ops Personnel</h4>
                            <div className="space-y-3">
                              {selectedEvent.speakers.map((s, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 bg-brand-bg rounded-lg border border-brand-border/50">
                                  <div className="w-8 h-8 rounded bg-brand-neon/20 flex items-center justify-center text-brand-neon font-bold text-xs">
                                    {s.name[0]}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold uppercase">{s.name}</div>
                                    <div className="text-[9px] font-mono text-brand-muted uppercase">{s.role}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-mono text-brand-muted uppercase mb-2">Geolocation Matrix</h4>
                          <div className="aspect-video bg-brand-bg rounded-xl border border-brand-border relative overflow-hidden flex items-center justify-center group">
                            <div className="absolute inset-0 technical-grid opacity-20" />
                            <div className="relative text-center p-4">
                              <Globe size={32} className="text-brand-neon mx-auto mb-2 opacity-30 group-hover:scale-110 transition-transform" />
                              <div className="text-[9px] font-mono text-brand-muted max-w-[150px] mx-auto uppercase">
                                {selectedEvent.location?.address || "Address Encrypted"}
                              </div>
                              <div className="mt-2 text-[8px] font-mono text-brand-neon opacity-50">
                                {selectedEvent.location?.lat}, {selectedEvent.location?.lng}
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 px-2 py-1 bg-brand-neon text-brand-bg text-[8px] font-black uppercase rounded">
                              Live Map
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-brand-surface border border-brand-neon/20 rounded-2xl">
                          <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-mono text-brand-muted uppercase">Mint Fee</span>
                            <span className="text-2xl font-black text-brand-neon">₹{selectedEvent.price}</span>
                          </div>
                          <button 
                            disabled={loading}
                            onClick={() => {
                              purchaseTicket(selectedEvent.id);
                              setSelectedEvent(null);
                            }}
                            className="w-full py-4 bg-brand-neon text-brand-bg font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                          >
                            {loading ? "Processing..." : "Mint Access Pass"}
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

          {/* Ticket Modal */}
          <AnimatePresence>
            {selectedTicket && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedTicket(null)}
                  className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" 
                />
                <motion.div 
                  layoutId={selectedTicket.id}
                  className="relative w-full max-w-xl bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl"
                >
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h2 className="text-3xl font-black uppercase mb-2">{selectedTicket.eventName}</h2>
                        <p className="text-brand-muted font-mono text-xs uppercase">Authorized Owner: {selectedTicket.owner}</p>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted">
                        <Zap className="rotate-45" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                      <TicketQR ticketId={selectedTicket.id} />
                      
                      <div className="space-y-4">
                        <div className="p-6 bg-brand-bg rounded-2xl border border-brand-border">
                          <div className="text-[10px] font-mono text-brand-muted uppercase mb-1">Ticket Integrity</div>
                          <div className="text-brand-neon font-bold flex items-center gap-2">
                            <ShieldAlert size={14} /> Layer 4: Rolling Cryptography Active
                          </div>
                        </div>
                        
                        <button 
                          disabled={verifying}
                          onClick={() => verifyAtGate(selectedTicket.id)}
                          className="w-full py-4 bg-brand-neon text-brand-bg font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                          {verifying ? "Verifying..." : "Present at Gate"}
                          <ShieldCheck size={18} />
                        </button>

                        {!selectedTicket.isSoulbound && (
                          <button 
                            onClick={() => {
                              setTransferingTicket(selectedTicket);
                              setSelectedTicket(null);
                            }}
                            className="w-full py-4 bg-transparent border border-brand-border text-brand-muted hover:border-brand-neon hover:text-brand-neon font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            <ArrowRightLeft size={18} />
                            Secondary Transfer
                          </button>
                        )}

                        {selectedTicket.isSoulbound && (
                          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                            <p className="text-[10px] font-mono text-purple-400 uppercase font-black text-center leading-none mb-1">
                              Layer 1: Soulbound Locked
                            </p>
                            <p className="text-[9px] text-purple-300/70 text-center uppercase tracking-tighter">
                              Resale rejected by Smart Contract
                            </p>
                          </div>
                        )}

                        <p className="text-[10px] text-brand-muted font-mono uppercase text-center">
                          DO NOT SHARE THIS QR. IT IS LINKED TO YOUR PRIVATE KEY.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Transfer Modal */}
            {transferingTicket && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setTransferingTicket(null)}
                  className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" 
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl p-8"
                >
                  <h2 className="text-2xl font-black uppercase mb-2">Initialize Transfer</h2>
                  <p className="text-brand-muted text-xs mb-8">
                    Transferring <span className="text-brand-text font-bold uppercase">{transferingTicket.eventName}</span>
                  </p>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-mono text-brand-muted uppercase mb-2 block">Recipient Wallet Address</label>
                      <input 
                        type="text" 
                        value={transferTarget}
                        onChange={(e) => setTransferTarget(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 font-mono text-xs focus:border-brand-neon outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-brand-muted uppercase mb-2 block">Transfer Price (INR)</label>
                      <input 
                        type="number" 
                        value={transferPrice}
                        onChange={(e) => setTransferPrice(e.target.value)}
                        placeholder="50.00"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 font-mono text-xs focus:border-brand-neon outline-none" 
                      />
                      <div className="mt-2 flex justify-between">
                        <span className="text-[10px] font-mono text-brand-muted uppercase">Max Price Allowed:</span>
                        <span className="text-[10px] font-mono text-brand-neon uppercase font-bold">
                          ₹{(transferingTicket.originalPrice * 1.1).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-brand-neon/10 rounded-xl border border-brand-neon/20">
                      <p className="text-[10px] font-semibold text-brand-neon italic leading-snug">
                        "Smart Contract analysis: Any price exceeding 110% of Mint will trigger an automatic security rejection."
                      </p>
                    </div>

                    <button 
                      disabled={loading || !transferTarget || !transferPrice}
                      onClick={transferTicket}
                      className="w-full py-5 bg-brand-neon text-brand-bg font-black uppercase tracking-[.2em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {loading ? "Simulating Consensus..." : "Execute Transfer"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Footer / Dev Stats */}
          <footer className="fixed bottom-0 left-0 right-0 h-10 bg-brand-surface border-t border-brand-border flex items-center px-4 md:px-8 justify-between z-40 bg-opacity-90 backdrop-blur">
            <div className="flex items-center gap-4 text-[10px] font-mono text-brand-muted uppercase">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-brand-neon rounded-full animate-pulse" /> Local Node: Active</span>
              <span className="hidden md:inline">TPS: 1,240</span>
              <span className="hidden md:inline">Network: Chaintix Mainnet</span>
            </div>
            <div className="text-[10px] font-mono text-brand-muted uppercase flex items-center gap-3">
              <span>04-28-2026 // 04:32:43</span>
              <div className="flex gap-1 h-3">
                {[1,2,3,4,5].map(i => <div key={i} className="w-1 bg-brand-neon/30 rounded-full" />)}
              </div>
            </div>
          </footer>
        </div>
      );
    }
