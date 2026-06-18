import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "../lib/AuthContext";

type Role = "employee" | "manager" | "admin";

type RoleContextType = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role: Role = (user?.role as Role) ?? "employee";
  // no-op: role is now derived from the authenticated user
  const setRole = (_role: Role) => {};

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
}
