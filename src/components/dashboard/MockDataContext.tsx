"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchConnections, type Connection } from "@/lib/connections-client";
import {
  fetchIntegrations,
  createIntegration,
  deleteIntegration,
  type Integration,
  type CreateIntegrationInput,
} from "@/lib/integrations-client";

interface MockDataContextValue {
  connections: Connection[];
  isLoadingConnections: boolean;
  addConnection: (connection: Connection) => void;
  removeConnection: (id: string) => void;
  integrations: Integration[];
  isLoadingIntegrations: boolean;
  addIntegration: (input: CreateIntegrationInput) => Promise<void>;
  removeIntegration: (id: string) => Promise<void>;
}

const MockDataContext = createContext<MockDataContextValue | null>(null);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);

  useEffect(() => {
    fetchConnections()
      .then(setConnections)
      .catch(() => setConnections([]))
      .finally(() => setIsLoadingConnections(false));

    fetchIntegrations()
      .then(setIntegrations)
      .catch(() => setIntegrations([]))
      .finally(() => setIsLoadingIntegrations(false));
  }, []);

  function addConnection(connection: Connection) {
    setConnections((prev) => [connection, ...prev]);
  }

  function removeConnection(id: string) {
    setConnections((prev) => prev.filter((connection) => connection._id !== id));
  }

  async function addIntegration(input: CreateIntegrationInput) {
    const integration = await createIntegration(input);
    setIntegrations((prev) => [integration, ...prev]);
  }

  async function removeIntegration(id: string) {
    await deleteIntegration(id);
    setIntegrations((prev) => prev.filter((integration) => integration._id !== id));
  }

  return (
    <MockDataContext.Provider
      value={{
        connections,
        isLoadingConnections,
        addConnection,
        removeConnection,
        integrations,
        isLoadingIntegrations,
        addIntegration,
        removeIntegration,
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) throw new Error("useMockData must be used within MockDataProvider");
  return context;
}
