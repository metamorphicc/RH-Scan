param(
  [string] $BaseUrl = "http://127.0.0.1:3000"
)

$addresses = @(
  "0x492641F648a4986844848E0beFE66D14817bCE34",
  "0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4",
  "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
  "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67",
  "0xcE24439F2D9C6a2289F741120FE202248B666666",
  "0xeeca2E7Dc194a320d349122d88259bB9595a4cB0",
  "0x39dBED3a2bd333467115dE45665cC57F813C4571",
  "0x74BE72AFFAFbC8de30F0C11247814036314D625f",
  "0xc6911796042b15d7Fa4F6CDe69e245DdCd3d9c31",
  "0x5E49E1f85813F2B65858860A3FA231b4186f2e0E",
  "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
  "0x241F3Caad03Db31137F641beF005A32176530024",
  "0x020bfC650A365f8BB26819deAAbF3E21291018b4",
  "0x40858070814a57FdF33a613ae84fE0a8b4a874f7",
  "0x8f86a15EC17cb3369d8b3E666dAdBC11daA82b79",
  "0x1755C2910c126eE1b0CF1E08a307Dc9E787285a0",
  "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  "0x4d14284aFe559B7c6B9e6FAd6ebAeaA0F6051818",
  "0x0bb40D7fbaE7f0C69Bc5910C601987dce697d85F"
)

$rows = foreach ($address in $addresses) {
  $uri = "$BaseUrl/api/check?token=$address"

  try {
    $result = Invoke-RestMethod -Uri $uri -TimeoutSec 60
    [pscustomobject]@{
      address = $address
      verdict = $result.verdict
      block = $result.block
      facts = ($result.facts -join " | ")
      error = $null
    }
  } catch {
    [pscustomobject]@{
      address = $address
      verdict = $null
      block = $null
      facts = $null
      error = $_.Exception.Message
    }
  }
}

$rows | Format-Table -AutoSize

$falseOk = $rows | Where-Object { $_.verdict -eq "ok to size small" -and $_.facts -match "unknown" }

if ($falseOk) {
  Write-Error "Potential false ok to size small results found."
  exit 1
}

