"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  initializeProject,
  fundProject,
  withdrawFunds,
  getProjectState,
  getVaultBalance,
  lamportsToSol,
  type ProjectState,
} from "@/lib/solana/program";

export interface UseSolanaProgramReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initProject: (
    projectId: bigint,
    budgetSol: number,
    deadlineUnixTs: number
  ) => Promise<string | null>;
  
  fundProjectAction: (
    creatorPubkey: string,
    projectId: bigint,
    amountSol: number
  ) => Promise<string | null>;
  
  withdrawFundsAction: (projectId: bigint) => Promise<string | null>;
  
  // Queries
  fetchProjectState: (
    creatorPubkey: string,
    projectId: bigint
  ) => Promise<ProjectState | null>;
  
  fetchVaultBalance: (
    creatorPubkey: string,
    projectId: bigint
  ) => Promise<number>;
  
  clearError: () => void;
}

export function useSolanaProgram(): UseSolanaProgramReturn {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initialize a new funding project on-chain
   */
  const initProject = useCallback(
    async (
      projectId: bigint,
      budgetSol: number,
      deadlineUnixTs: number
    ): Promise<string | null> => {
      if (!publicKey || !connected) {
        setError("Wallet not connected");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const transaction = await initializeProject(
          connection,
          publicKey,
          projectId,
          budgetSol,
          deadlineUnixTs
        );

        const signature = await sendTransaction(transaction, connection);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");
        
        return signature;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize project";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [connection, publicKey, sendTransaction, connected]
  );

  /**
   * Fund an existing project
   */
  const fundProjectAction = useCallback(
    async (
      creatorPubkey: string,
      projectId: bigint,
      amountSol: number
    ): Promise<string | null> => {
      if (!publicKey || !connected) {
        setError("Wallet not connected");
        return null;
      }

      if (amountSol <= 0) {
        setError("Amount must be greater than 0");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const creator = new PublicKey(creatorPubkey);
        
        const transaction = await fundProject(
          connection,
          publicKey,
          creator,
          projectId,
          amountSol
        );

        const signature = await sendTransaction(transaction, connection);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");
        
        return signature;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fund project";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [connection, publicKey, sendTransaction, connected]
  );

  /**
   * Withdraw funds from a completed project (creator only)
   */
  const withdrawFundsAction = useCallback(
    async (projectId: bigint): Promise<string | null> => {
      if (!publicKey || !connected) {
        setError("Wallet not connected");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const transaction = await withdrawFunds(
          connection,
          publicKey,
          projectId
        );

        const signature = await sendTransaction(transaction, connection);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");
        
        return signature;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to withdraw funds";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [connection, publicKey, sendTransaction, connected]
  );

  /**
   * Fetch on-chain project state
   */
  const fetchProjectState = useCallback(
    async (
      creatorPubkey: string,
      projectId: bigint
    ): Promise<ProjectState | null> => {
      try {
        const creator = new PublicKey(creatorPubkey);
        return await getProjectState(connection, creator, projectId);
      } catch (err) {
        console.error("Failed to fetch project state:", err);
        return null;
      }
    },
    [connection]
  );

  /**
   * Fetch vault balance for a project
   */
  const fetchVaultBalance = useCallback(
    async (creatorPubkey: string, projectId: bigint): Promise<number> => {
      try {
        const creator = new PublicKey(creatorPubkey);
        return await getVaultBalance(connection, creator, projectId);
      } catch (err) {
        console.error("Failed to fetch vault balance:", err);
        return 0;
      }
    },
    [connection]
  );

  return {
    isLoading,
    error,
    initProject,
    fundProjectAction,
    withdrawFundsAction,
    fetchProjectState,
    fetchVaultBalance,
    clearError,
  };
}

// Re-export utility function
export { lamportsToSol };
