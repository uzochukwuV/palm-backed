import { Zap, Shield, Coins } from 'lucide-react'

export function TechStack() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Built on Solana with PUSD
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A trustless, open platform enabling everyone—entrepreneurs, artists, makers, students—to fund their goals with speed, security, and zero censorship.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Solana Section */}
          <div className="rounded-2xl bg-card border border-border p-8">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Solana Blockchain</h3>
            <p className="text-muted-foreground mb-4">
              Lightning-fast transactions with minimal fees. Solana's high throughput ensures your funding is processed instantly.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>65,000+ TPS capability</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Sub-second finality</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Minimal transaction costs</span>
              </li>
            </ul>
          </div>

          {/* PUSD Section */}
          <div className="rounded-2xl bg-card border border-border p-8">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Coins className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">PUSD Stablecoin</h3>
            <p className="text-muted-foreground mb-4">
              Palm USD (PUSD) is a USD-pegged stablecoin with no freeze function, no blacklist, and no pause capabilities.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>1:1 USD peg</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Non-freezable & uncensorable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Native SPL token</span>
              </li>
            </ul>
          </div>

          {/* Multi-Token Support */}
          <div className="rounded-2xl bg-card border border-border p-8">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Multiple Payment Tokens</h3>
            <p className="text-muted-foreground mb-4">
              Support for multiple stablecoins giving backers flexibility in how they fund projects.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>PUSD (Palm USD)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>USDC (Circle USD Coin)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>USDT (Tether USD)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16 rounded-2xl bg-muted/50 border border-border p-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Why Solana + PUSD?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-muted-foreground mb-2">
                <span className="font-semibold text-foreground">Speed & Efficiency:</span> Solana's blazing-fast blockchain paired with PUSD's non-freezable stablecoin creates the perfect infrastructure for creator funding.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">
                <span className="font-semibold text-foreground">True Decentralization:</span> PUSD&apos;s lack of freeze or blacklist functions ensures creators maintain full control over their funds with no corporate gatekeepers.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Developer-Friendly:</span> Built on Solana, a platform that empowers developers to build innovative solutions and push the boundaries of what&apos;s possible.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Accessibility:</span> Multiple stablecoin options ensure everyone can participate, regardless of their preferred token.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
