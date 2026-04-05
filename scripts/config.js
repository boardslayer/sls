// Venue configuration for SLS (Security Literature Search)
// To add a new conference, add an entry here and update index.html filter chips

export const VENUES = [
  {
    key: "CCS",
    name: "CCS",
    fullName: "ACM Conference on Computer and Communications Security",
    color: "#22c55e",
    dblpQuery: "venue:CCS:",
  },
  {
    key: "NDSS",
    name: "NDSS",
    fullName: "Network and Distributed System Security Symposium",
    color: "#3b82f6",
    dblpQuery: "venue:NDSS:",
  },
  {
    key: "USENIX",
    name: "USENIX Security",
    fullName: "USENIX Security Symposium",
    color: "#ef4444",
    dblpQuery: "venue:USENIX Security:",
  },
  {
    key: "SP",
    name: "IEEE S&P",
    fullName: "IEEE Symposium on Security and Privacy",
    color: "#a855f7",
    dblpQuery: "venue:SP:",
  },
  {
    key: "CRYPTO",
    name: "CRYPTO",
    fullName: "Annual International Cryptology Conference",
    color: "#86efac",
    dblpQuery: "venue:CRYPTO:",
  },
  {
    key: "EUROCRYPT",
    name: "EUROCRYPT",
    fullName:
      "International Conference on the Theory and Application of Cryptographic Techniques",
    color: "#06b6d4",
    dblpQuery: "venue:EUROCRYPT:",
  },
  {
    key: "EuroSP",
    name: "EURO S&P",
    fullName: "IEEE European Symposium on Security and Privacy",
    color: "#4f46e5",
    dblpQuery: "venue:EuroS&P:",
  },
  {
    key: "VehicleSec",
    name: "VehicleSec",
    fullName: "ISOC Symposium on Vehicle Security and Privacy",
    color: "#f97316",
    dblpQuery: "venue:VehicleSec:",
  },
  {
    key: "TITS",
    name: "IEEE T-ITS",
    fullName: "IEEE Transactions on Intelligent Transportation Systems",
    color: "#10b981",
    dblpQuery: "stream:journals/tits:",
  },
  {
    key: "TVT",
    name: "IEEE TVT",
    fullName: "IEEE Transactions on Vehicular Technology",
    color: "#8b5cf6",
    dblpQuery: "stream:journals/tvt:",
  },
  {
    key: "VC",
    name: "Veh. Comms.",
    fullName: "Vehicular Communications",
    color: "#84cc16",
    dblpQuery: "stream:journals/vc:",
  },
  {
    key: "TIFS",
    name: "TIFS",
    fullName: "IEEE Transactions on Information Forensics and Security",
    color: "#f59e0b",
    dblpQuery: "stream:journals/tifs:",
  },
  {
    key: "TDSC",
    name: "TDSC",
    fullName: "IEEE Transactions on Dependable and Secure Computing",
    color: "#fda4af",
    dblpQuery: "stream:journals/tdsc:",
  },
  {
    key: "COMPSEC",
    name: "Comp. & Sec.",
    fullName: "Computers & Security",
    color: "#6366f1",
    dblpQuery: "stream:journals/compsec:",
  },
];

// DBLP API settings
export const DBLP_API_BASE = "https://dblp.org/search/publ/api";
export const DBLP_HITS_PER_PAGE = 1000;
export const DBLP_DELAY_MS = 1500; // Delay between API requests to be polite

// Semantic Scholar API settings
export const S2_API_BASE = "https://api.semanticscholar.org/graph/v1/paper";
export const S2_FIELDS = "abstract,citationCount,tldr,openAccessPdf";
export const S2_RATE_LIMIT = 5; // requests per second
export const S2_CACHE_DIR = "data/s2-cache";
