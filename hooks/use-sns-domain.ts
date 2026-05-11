'use client'

import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import {
  getDomainMint,
  reverseLookup,
  NameRegistryState,
} from '@bonfida/spl-name-service'

/**
 * Hook to fetch SNS domain name for a given Solana public key
 */
export function useSNSDomain(publicKey: PublicKey | null) {
  const { connection } = useConnection()
  const [domain, setDomain] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publicKey || !connection) {
      setDomain(null)
      return
    }

    const fetchDomain = async () => {
      try {
        setLoading(true)
        setError(null)

        // Reverse lookup: get domain name from wallet address
        const domainName = await reverseLookup(connection, publicKey)

        if (domainName) {
          // Domain names are stored without .sol extension, add it for display
          setDomain(`${domainName}.sol`)
        } else {
          setDomain(null)
        }
      } catch (err) {
        console.error('[v0] SNS domain lookup error:', err)
        setError(null) // Silently fail - not having a domain is normal
        setDomain(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDomain()
  }, [publicKey, connection])

  return { domain, loading, error }
}
