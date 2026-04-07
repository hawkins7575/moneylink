$shortcuts = @(
    [PSCustomObject]@{ id = 1775108856001; title = 'Naver'; url = 'https://www.naver.com' },
    [PSCustomObject]@{ id = 1775108856002; title = 'Google'; url = 'https://www.google.com' },
    [PSCustomObject]@{ id = 1775108856003; title = 'YouTube'; url = 'https://www.youtube.com' },
    [PSCustomObject]@{ id = 1775108856004; title = 'TradingView'; url = 'https://www.tradingview.com' },
    [PSCustomObject]@{ id = 1775108856005; title = 'Investing.com'; url = 'https://www.investing.com' },
    [PSCustomObject]@{ id = 1775108856006; title = 'CoinMarketCap'; url = 'https://coinmarketcap.com' },
    [PSCustomObject]@{ id = 1775108856007; title = 'Upbit'; url = 'https://upbit.com' },
    [PSCustomObject]@{ id = 1775108856008; title = 'Binance'; url = 'https://www.binance.com' },
    [PSCustomObject]@{ id = 1775108856009; title = 'Bithumb'; url = 'https://www.bithumb.com' },
    [PSCustomObject]@{ id = 1775108856010; title = 'Yahoo Finance'; url = 'https://finance.yahoo.com' },
    [PSCustomObject]@{ id = 1775108856011; title = 'MK News'; url = 'https://www.mk.co.kr' },
    [PSCustomObject]@{ id = 1775108856012; title = 'Hankyung'; url = 'https://www.hankyung.com' },
    [PSCustomObject]@{ id = 1775108856013; title = 'DART'; url = 'https://dart.fss.or.kr' },
    [PSCustomObject]@{ id = 1775108856014; title = 'KRX'; url = 'http://www.krx.co.kr' },
    [PSCustomObject]@{ id = 1775108856015; title = 'FedWatch'; url = 'https://www.cmegroup.com/trading/interest-rates/countdown-to-fomc.html' },
    [PSCustomObject]@{ id = 1775108856016; title = 'CNN Fear & Greed'; url = 'https://edition.cnn.com/markets/fear-and-greed' },
    [PSCustomObject]@{ id = 1775108856017; title = 'Finviz'; url = 'https://finviz.com' },
    [PSCustomObject]@{ id = 1775108856018; title = 'Whale Alert'; url = 'https://whale-alert.io' },
    [PSCustomObject]@{ id = 1775108856019; title = 'Glassnode'; url = 'https://glassnode.com' },
    [PSCustomObject]@{ id = 1775108856020; title = 'DefiLlama'; url = 'https://defillama.com' }
)

try {
    $data = Invoke-RestMethod -Uri "http://127.0.0.1:8085/api/data"
    $data | Add-Member -MemberType NoteProperty -Name "shortcuts" -Value $shortcuts -Force
    $json = $data | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Uri "http://127.0.0.1:8085/api/data" -Method Post -Body $json -ContentType "application/json"
    Write-Host "Migration Successful"
} catch {
    Write-Error "Migration Failed: $_"
}
