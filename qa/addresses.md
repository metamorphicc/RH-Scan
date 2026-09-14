# Stage 7 QA Addresses

Source: Robinhood Chain Blockscout REST API, fetched 2026-09-15.

- Token list: `https://robinhoodchain.blockscout.com/api/v2/tokens?type=ERC-20`
- Address details: `https://robinhoodchain.blockscout.com/api/v2/addresses/{address}`

These addresses are for QA coverage only. Explorer `reputation: ok`, market data, holder count, or volume must not be treated as the rhcheck verdict.

## QA Goal

- Run all 20 addresses through `/api/check`.
- Manually compare at least 5 addresses against the explorer.
- Target: zero false `ok to size small` results.
- Unknown fields must not produce `ok to size small`.

## Addresses

| # | Category | Symbol | Name | Address | Explorer note |
| - | - | - | - | - | - |
| 1 | large listed asset | LINK | Chainlink | `0x492641F648a4986844848E0beFE66D14817bCE34` | verified token, 62 holders |
| 2 | large listed asset | CBBTC | Coinbase Wrapped BTC | `0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4` | verified token, 9333 holders |
| 3 | stable / dollar asset | USDE | Ethena USDe | `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34` | listed ERC-20 |
| 4 | stable / dollar asset | USDG | Global Dollar | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | listed ERC-20, high holders |
| 5 | large listed asset | TAO | Bittensor | `0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67` | listed ERC-20 |
| 6 | stable / dollar asset | U | United Stables | `0xcE24439F2D9C6a2289F741120FE202248B666666` | listed ERC-20 |
| 7 | listed asset | LIT | Lighter | `0xeeca2E7Dc194a320d349122d88259bB9595a4cB0` | listed ERC-20 |
| 8 | meme / social token | PONS | Pons | `0x39dBED3a2bd333467115dE45665cC57F813C4571` | listed ERC-20, high holders |
| 9 | meme / social token | PENGU | Pudgy Penguins | `0x74BE72AFFAFbC8de30F0C11247814036314D625f` | listed ERC-20 |
| 10 | listed asset | VIRTUAL | Virtuals Protocol | `0xc6911796042b15d7Fa4F6CDe69e245DdCd3d9c31` | listed ERC-20 |
| 11 | listed asset | PENDLE | Pendle | `0x5E49E1f85813F2B65858860A3FA231b4186f2e0E` | listed ERC-20 |
| 12 | meme / social token | AI | Artificial Inu | `0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18` | listed ERC-20 |
| 13 | meme / social token | NPC | Non-Playable Coin | `0x241F3Caad03Db31137F641beF005A32176530024` | listed ERC-20 |
| 14 | meme / social token | CASHCAT | Cash Cat | `0x020bfC650A365f8BB26819deAAbF3E21291018b4` | verified token, 111209 holders |
| 15 | stable / yield asset | SYRUPUSDG | syrupUSDG | `0x40858070814a57FdF33a613ae84fE0a8b4a874f7` | listed ERC-20 |
| 16 | listed asset | APE | ApeCoin | `0x8f86a15EC17cb3369d8b3E666dAdBC11daA82b79` | listed ERC-20 |
| 17 | listed asset | 1INCH | 1INCH | `0x1755C2910c126eE1b0CF1E08a307Dc9E787285a0` | listed ERC-20 |
| 18 | quote token | WETH | WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | verified token, 548279 holders |
| 19 | meme / social token | BLORB | BLORB | `0x4d14284aFe559B7c6B9e6FAd6ebAeaA0F6051818` | listed ERC-20 |
| 20 | listed asset | SUSHI | Sushi | `0x0bb40D7fbaE7f0C69Bc5910C601987dce697d85F` | listed ERC-20 |

## Manual Spot Checks

Verified via `GET /api/v2/addresses/{address}` on 2026-09-15.

| Address | Symbol | is_contract | is_verified | Creator | Creation tx |
| - | - | - | - | - | - |
| `0x492641F648a4986844848E0beFE66D14817bCE34` | LINK | true | true | `0x062f05CD6c835677B05a8658A351969476861316` | `0xd860765955ba73bfd6a1cbe53fec629f4a9672ce57c516dd6549234a235dfdb5` |
| `0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4` | CBBTC | true | true | `0x062f05CD6c835677B05a8658A351969476861316` | `0x3a4300b87b691acc4c7bd47756c7cdc883376c6fe532d22bda16efedebfb44d6` |
| `0x020bfC650A365f8BB26819deAAbF3E21291018b4` | CASHCAT | true | true | `0xD9eC2db5f3D1b236843925949fe5bd8a3836FCcB` | `0x0e6d23f0babd02ede4aefaa923486591d783e1180c277c71e2f2a39fc74a4661` |
| `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | WETH | true | true | `0xE83b11Faa5693E68388785FecA3595C6805dFb9a` | `0x05317cd173ba8e973c7e88aeb7f7e56eb22cf05c12552d4283c993dbb1f56b12` |
| `0x9D4A92aA4Cd18C75316070bf60c34de1CAB99999` | PHERA | true | true | `0x4e59b44847b379578588920cA78FbF26c0B4956C` | `0x1849cd35e6a2a43d7e276ee4cfc4a32ef6f5cfc194d0f03a2cabe308e3963973` |

## Run Notes

Use `qa/run-checks.ps1` while `pnpm dev` is running.

Current expected behavior until verified venues are added to `lib/venues.ts`:

- pool is usually `unknown`;
- deployer is usually `unknown` unless passed manually;
- `ok to size small` should not appear for unknown-critical data.

## Run Log

2026-09-15:

- Command: `.\qa\run-checks.ps1`
- Result: all 20 addresses returned `thin`.
- Block range observed: `63005546` to `63005961`.
- Potential false `ok to size small`: 0.
- Notes: most results included unknown authority/pool/deployer facts, so the rules correctly did not return `ok to size small`.
