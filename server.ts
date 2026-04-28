import express from "express";
import cors from "cors";

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log("[DEBUG] server.ts execution started");
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("[DEBUG] startServer() invoked");
  const app = express();
  const PORT = 3000;
  console.log(`[INIT] Port: ${PORT}`);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // === REQUEST DEBUGGING ===
  app.use((req, res, next) => {
    console.log(`[RCV] ${req.method} ${req.url}`);
    next();
  });

  // === DIAGNOSTIC ROUTES ===
  app.get("/api/health", (req, res) => {
    console.log("[HEALTH] Check requested");
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      node: process.version,
      env: process.env.NODE_ENV || 'development'
    });
  });

  app.get("/api/ping", (req, res) => {
    res.send("pong");
  });

  // === SIMULATED BLOCKCHAIN STATE ===
  interface Block {
    index: number;
    timestamp: number;
    transactions: Transaction[];
    prevHash: string;
    hash: string;
  }

  interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    type: "MINT" | "TRANSFER" | "BURN";
    metadata?: any;
  }

  interface Ticket {
    id: string;
    owner: string;
    eventId: string;
    eventName: string;
    originalPrice: number;
    resaleCap: number; // e.g. 1.10 for 110%
    purchasedAt: number;
    status: "ACTIVE" | "USED" | "VOID";
    isSoulbound: boolean;
  }

  let chain: Block[] = [{
    index: 0,
    timestamp: Date.now(),
    transactions: [],
    prevHash: "0",
    hash: "CHAINTIX_GENESIS_BLOCK"
  }];

  let tickets: Ticket[] = [];
  let events = [
    { 
      id: "e1", 
      name: "Mumbai Crypto Con 2026", 
      price: 2500, 
      date: "2026-05-10", 
      venue: "BKC, Mumbai", 
      isSoulbound: false,
      description: "India's largest gathering of Web3 developers, investors, and enthusiasts. Join us for a day of deep dives into ZK-Proofs, L2 scaling, and the future of DeFi.",
      speakers: [
        { name: "Sandeep Nailwal", role: "Co-founder, Polygon" },
        { name: "Vitalik Buterin", role: "Co-founder, Ethereum (Remote)" },
        { name: "Nischal Shetty", role: "CEO, Shardeum" }
      ],
      location: { lat: 19.0622, lng: 72.8624, address: "MMRDA Grounds, G Block BKC, Bandra Kurla Complex, Mumbai, Maharashtra 400051" }
    },
    { 
      id: "e2", 
      name: "Bangalore Tech Summit", 
      price: 1800, 
      date: "2026-06-22", 
      venue: "BIEC, Bengaluru", 
      isSoulbound: false,
      description: "Exploring the intersections of AI, Blockchain, and Quantum Computing. The summit brings together industry leaders to discuss the next decade of technological disruption.",
      speakers: [
        { name: "Nandan Nilekani", role: "Chairman, Infosys" },
        { name: "Byju Raveendran", role: "Founder, BYJU'S" }
      ],
      location: { lat: 13.0623, lng: 77.4748, address: "10th Mile, Tumkur Road, Bengaluru, Karnataka 562123" }
    },
    { 
      id: "e3", 
      name: "Delhi Metro Monthly Pass", 
      price: 1500, 
      date: "2026-05-01", 
      venue: "DMRC Network", 
      isSoulbound: true,
      description: "Cryptographically secured unlimited monthly travel pass for the entire Delhi Metro Rail Network. Non-transferable Soulbound Token.",
      speakers: [],
      location: { lat: 28.6139, lng: 77.2090, address: "Metro Bhawan, Fire Brigade Lane, Barakhamba Road, New Delhi" }
    },
    { 
      id: "e4", 
      name: "Rajdhani Express: Delhi-Mumbai", 
      price: 4200, 
      date: "2026-05-15", 
      venue: "Indian Railways", 
      isSoulbound: true,
      description: "Premium travel ticket for Train 12952. Your identity is verified against your government ID during minting. Resale is strictly prohibited.",
      speakers: [],
      location: { lat: 28.6415, lng: 77.2210, address: "New Delhi Railway Station, Bhavbhuti Marg, Ratan Lal Market, New Delhi" }
    },
    { 
      id: "e5", 
      name: "Kolkata Digital Bus Pass", 
      price: 800, 
      date: "2026-05-01", 
      venue: "WBTC Network", 
      isSoulbound: true,
      description: "Soulbound bus pass for all WBTC AC/Non-AC buses in Kolkata Metropolitan Area. Valid for 30 days from minting.",
      speakers: [],
      location: { lat: 22.5726, lng: 88.3639, address: "Transport Bhawan, 12, R.N. Mukherjee Road, Kolkata" }
    },
    { 
      id: "e6", 
      name: "Sunburn Goa 2026", 
      price: 7500, 
      date: "2026-12-28", 
      venue: "Vagator, Goa", 
      isSoulbound: false,
      description: "Asia's biggest electronic dance music festival. 3 days of non-stop music, immersive experiences, and sunset vibes on the shores of Vagator.",
      speakers: [
        { name: "Martin Garrix", role: "Headliner" },
        { name: "DJ Snake", role: "Headliner" },
        { name: "Sunnery James", role: "DJ" }
      ],
      location: { lat: 15.6030, lng: 73.7336, address: "Vagator Beach, Bardez, Goa" }
    },
  ];

  function calculateHash(index: number, prevHash: string, timestamp: number, transactions: Transaction[]) {
    return crypto.createHash('sha256')
      .update(index + prevHash + timestamp + JSON.stringify(transactions))
      .digest('hex');
  }

  function addBlock(transactions: Transaction[]) {
    const prevBlock = chain[chain.length - 1];
    const index = prevBlock.index + 1;
    const timestamp = Date.now();
    const hash = calculateHash(index, prevBlock.hash, timestamp, transactions);
    const newBlock = { index, timestamp, transactions, prevHash: prevBlock.hash, hash };
    chain.push(newBlock);
    return newBlock;
  }

  // === API ROUTES ===
  app.get("/api/blockchain", (req, res) => {
    try {
      res.json({ chain: chain.slice(-10), tickets, events });
    } catch (err) {
      console.error("Failed to stringify state:", err);
      res.status(500).json({ error: "State Corruption" });
    }
  });

  // Purchase Ticket (MINT)
  app.post("/api/tickets/purchase", (req, res) => {
    const { eventId, walletAddress } = req.body;
    const event = events.find(e => e.id === eventId);
    
    if (!event) return res.status(404).json({ error: "Event not found" });

    const ticketId = crypto.randomUUID();
    const newTicket: Ticket = {
      id: ticketId,
      owner: walletAddress,
      eventId: event.id,
      eventName: event.name,
      originalPrice: event.price,
      resaleCap: 1.10, 
      purchasedAt: Date.now(),
      status: "ACTIVE",
      isSoulbound: !!event.isSoulbound
    };

    tickets.push(newTicket);
    
    const tx: Transaction = {
      id: crypto.randomUUID(),
      from: "0x0000000000000000", // System Mint
      to: walletAddress,
      amount: event.price,
      type: "MINT",
      metadata: { ticketId, eventName: event.name }
    };

    addBlock([tx]);
    res.json({ ticket: newTicket, txId: tx.id });
  });

  // Transfer Ticket (Enforce Scalping Prevention)
  app.post("/api/tickets/transfer", (req, res) => {
    const { ticketId, fromAddress, toAddress, price } = req.body;
    const ticketIdx = tickets.findIndex(t => t.id === ticketId && t.owner === fromAddress);

    if (ticketIdx === -1) return res.status(404).json({ error: "Ticket not found or unauthorized" });
    
    const ticket = tickets[ticketIdx];

    if (ticket.isSoulbound) {
      return res.status(403).json({ 
        error: "Defense Layer 1 Violation: This is a Soulbound Token (SBT). Resale or Transfer is strictly prohibited by the Smart Contract." 
      });
    }

    const maxPrice = ticket.originalPrice * ticket.resaleCap;

    if (price > maxPrice) {
      return res.status(400).json({ 
        error: `Scalping detected! Smart Contract enforces a maximum resale price of ₹${maxPrice.toFixed(2)} (Original: ₹${ticket.originalPrice} + 10%)` 
      });
    }

    // Process Transfer
    ticket.owner = toAddress;
    
    const tx: Transaction = {
      id: crypto.randomUUID(),
      from: fromAddress,
      to: toAddress,
      amount: price,
      type: "TRANSFER",
      metadata: { ticketId, price }
    };

    addBlock([tx]);
    res.json({ success: true, txId: tx.id });
  });

  // Verify Ticket signature (Dynamic QR generator input)
  app.get("/api/tickets/:id/signature", (req, res) => {
    const { id } = req.params;
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: "Not found" });

    // Dynamic window: 15 seconds
    const window = Math.floor(Date.now() / 15000);
    const secret = "CHAINTIX_INTERNAL_SECRET_K8";
    
    const signature = crypto.createHmac('sha256', secret)
      .update(`${ticket.id}:${ticket.owner}:${window}`)
      .digest('hex');

    res.json({ signature, window });
  });

  // Gate Verification (Layer 3)
  app.post("/api/tickets/:id/verify", (req, res) => {
    const { id } = req.params;
    const ticketIdx = tickets.findIndex(t => t.id === id);
    if (ticketIdx === -1) return res.status(404).json({ error: "Invalid Ticket" });
    
    const ticket = tickets[ticketIdx];
    if (ticket.status !== "ACTIVE") return res.status(400).json({ error: "Ticket already utilized or voided" });

    ticket.status = "USED";
    
    const tx: Transaction = {
      id: crypto.randomUUID(),
      from: ticket.owner,
      to: "0xGATE_VALIDATOR",
      amount: 0,
      type: "BURN",
      metadata: { ticketId: id, action: "GATE_ENTRY" }
    };

    addBlock([tx]);
    res.json({ success: true, message: "Gate Access Granted. Ticket Status: USED." });
  });

  // === VITE MIDDLEWARE ===
  if (process.env.NODE_ENV !== "production") {
    console.log("[INIT] Starting Vite in middleware mode...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[INIT] Vite middleware integrated.");
    } catch (e) {
      console.error("[ERROR] Failed to start Vite:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CHAINTIX] Server heartbeat active on port ${PORT}`);
  });
}

startServer();
