export interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN_OPS" | "APPROVER_EXECUTIVE" | "VIEWER_COMMISSIONER" | "VIEWER_INVESTOR";
  createdAt: string;
}

export interface Case {
  id: string;
  clientId: string;
  debtorName: string;
  amount: number;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "SETTLED";
  createdAt: string;
}

// Add more as needed...
