import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { fundProject, SOLANA_NETWORK } from '@/lib/solana/program';
import { createClient } from '@/lib/supabase/server';
import bs58 from 'bs58';

// SECURITY WARNING: For hackathon/demo only
const RELAY_WALLET_PRIVATE_KEY = process.env.RELAY_WALLET_PRIVATE_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!RELAY_WALLET_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Relay wallet not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      projectId, 
      creatorWallet, 
      onChainProjectId, 
      amountSol, 
      beneficiary,
      kiraPaymentCode 
    } = body;

    if (!projectId || !creatorWallet || !onChainProjectId || !amountSol) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize connection
    const endpoint = SOLANA_NETWORK === 'mainnet-beta'
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com'
      : process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
    
    const connection = new Connection(endpoint, 'confirmed');

    // Load relay wallet
    const relayKeypair = Keypair.fromSecretKey(bs58.decode(RELAY_WALLET_PRIVATE_KEY));
    const creator = new PublicKey(creatorWallet);
    
    // Beneficiary is the real user (if they have a wallet) or relay wallet
    const beneficiaryPubkey = beneficiary 
      ? new PublicKey(beneficiary) 
      : relayKeypair.publicKey;

    // Build and send funding transaction
    const transaction = await fundProject(
      connection,
      relayKeypair.publicKey,
      creator,
      BigInt(onChainProjectId),
      amountSol,
      beneficiaryPubkey
    );

    transaction.sign(relayKeypair);

    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );

    await connection.confirmTransaction(signature, 'confirmed');

    // Store contribution in database
    const supabase = await createClient();
    
    await supabase.from('contributions').insert({
      project_id: projectId,
      backer_id: null, // Cross-chain backer, no Supabase user
      amount: amountSol,
      transaction_signature: signature,
      payment_method: 'kira_pay',
      kira_payment_code: kiraPaymentCode,
    });

    // Update project funding
    const { data: project } = await supabase
      .from('projects')
      .select('current_funding, on_chain_total_funded')
      .eq('id', projectId)
      .single();

    if (project) {
      await supabase
        .from('projects')
        .update({
          current_funding: (project.current_funding || 0) + amountSol,
          on_chain_total_funded: (project.on_chain_total_funded || 0) + amountSol,
        })
        .eq('id', projectId);
    }

    return NextResponse.json({
      success: true,
      signature,
      relayWallet: relayKeypair.publicKey.toBase58(),
      beneficiary: beneficiaryPubkey.toBase58(),
    });

  } catch (error) {
    console.error('Relay fund-project error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Made with Bob
