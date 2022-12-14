# fio-burn-expired
Service to burn expired domains

## Environment variables

Include a .env file with:

```
server=          # FIO API node (e.g., https://fio.blockpane.com)
privateKey=      # FIO private key
publicKey=       # FIO public key
```

## Usage

npm run burn-domains  # Burn domains beyond 90 day expiration
npm run get-domains   # Get list of expired domains
npm run burn-nfts     # Burn NFTs that have been removed by users
npm run get-wraps     # Get recent FIO token wrap transactions
npm run pay-tpid      # Pay TPID rewards