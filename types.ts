export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  prevHash: string;
  hash: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: "MINT" | "TRANSFER" | "BURN";
  metadata?: any;
}

export interface Ticket {
  id: string;
  owner: string;
  eventId: string;
  eventName: string;
  originalPrice: number;
  resaleCap: number;
  purchasedAt: number;
  status: "ACTIVE" | "USED" | "VOID";
  isSoulbound: boolean;
}

export interface Event {
  id: string;
  name: string;
  price: number;
  date: string;
  venue: string;
  isSoulbound?: boolean;
  description?: string;
  speakers?: { name: string; role: string; avatar?: string }[];
  location?: { lat: number; lng: number; address: string };
}

export interface BlockchainState {
  chain: Block[];
  tickets: Ticket[];
  events: Event[];
}
