-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cashBalance" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "totalTopUps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'Unknown',
    "currentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousClose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dayHigh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dayLow" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketCap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "exchange" TEXT NOT NULL DEFAULT 'US',
    "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "avgCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "limitPrice" DOUBLE PRECISION,
    "fillPrice" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "cashBalance" DOUBLE PRECISION NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "realAmountCents" INTEGER NOT NULL,
    "virtualAmount" DOUBLE PRECISION NOT NULL,
    "stripeSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_contracts" (
    "id" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "optionType" TEXT NOT NULL,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "option_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "contracts" DOUBLE PRECISION NOT NULL,
    "premiumPaid" DOUBLE PRECISION NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closeProceeds" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "settlementNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "option_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_members" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startingPortfolio" DOUBLE PRECISION NOT NULL,
    "finalPortfolio" DOUBLE PRECISION,
    "rank" INTEGER,

    CONSTRAINT "league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_invites" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteePhone" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_userId_stockSymbol_key" ON "holdings"("userId", "stockSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_userId_stockSymbol_key" ON "watchlist_items"("userId", "stockSymbol");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_userId_snapshotAt_idx" ON "portfolio_snapshots"("userId", "snapshotAt");

-- CreateIndex
CREATE INDEX "price_history_stockSymbol_timestamp_idx" ON "price_history"("stockSymbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stripeSessionId_key" ON "transactions"("stripeSessionId");

-- CreateIndex
CREATE INDEX "option_contracts_stockSymbol_expiresAt_idx" ON "option_contracts"("stockSymbol", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "option_contracts_stockSymbol_optionType_strikePrice_expires_key" ON "option_contracts"("stockSymbol", "optionType", "strikePrice", "expiresAt");

-- CreateIndex
CREATE INDEX "option_positions_userId_status_idx" ON "option_positions"("userId", "status");

-- CreateIndex
CREATE INDEX "leagues_status_endsAt_idx" ON "leagues"("status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "league_members_leagueId_userId_key" ON "league_members"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "league_invites_token_key" ON "league_invites"("token");

-- CreateIndex
CREATE INDEX "league_invites_inviteePhone_status_idx" ON "league_invites"("inviteePhone", "status");

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_contracts" ADD CONSTRAINT "option_contracts_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_positions" ADD CONSTRAINT "option_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_positions" ADD CONSTRAINT "option_positions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "option_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_invites" ADD CONSTRAINT "league_invites_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_invites" ADD CONSTRAINT "league_invites_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
