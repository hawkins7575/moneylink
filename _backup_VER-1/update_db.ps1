$data = Get-Content 'database.json' -Raw | ConvertFrom-Json
$shortcuts = @()
$shortcuts += [PSCustomObject]@{id=1775108856001; title='Naver'; url='https://www.naver.com'}
$shortcuts += [PSCustomObject]@{id=1775108856002; title='Google'; url='https://www.google.com'}
$shortcuts += [PSCustomObject]@{id=1775108856003; title='YouTube'; url='https://www.youtube.com'}
$shortcuts += [PSCustomObject]@{id=1775108856004; title='TradingView'; url='https://www.tradingview.com'}
$shortcuts += [PSCustomObject]@{id=1775108856005; title='Investing.com'; url='https://www.investing.com'}
$shortcuts += [PSCustomObject]@{id=1775108856006; title='CoinMarketCap'; url='https://coinmarketcap.com'}
$shortcuts += [PSCustomObject]@{id=1775108856007; title='Upbit'; url='https://upbit.com'}
$shortcuts += [PSCustomObject]@{id=1775108856008; title='Binance'; url='https://www.binance.com'}
$shortcuts += [PSCustomObject]@{id=1775108856009; title='Bithumb'; url='https://www.bithumb.com'}
$shortcuts += [PSCustomObject]@{id=1775108856010; title='Yahoo Finance'; url='https://finance.yahoo.com'}
$shortcuts += [PSCustomObject]@{id=1775108856011; title='MK News'; url='https://www.mk.co.kr'}
$shortcuts += [PSCustomObject]@{id=1775108856012; title='Hankyung'; url='https://www.hankyung.com'}
$shortcuts += [PSCustomObject]@{id=1775108856013; title='DART'; url='https://dart.fss.or.kr'}
$shortcuts += [PSCustomObject]@{id=1775108856014; title='KRX'; url='http://www.krx.co.kr'}
$shortcuts += [PSCustomObject]@{id=1775108856015; title='FedWatch'; url='https://www.cmegroup.com/trading/interest-rates/countdown-to-fomc.html'}
$shortcuts += [PSCustomObject]@{id=1775108856016; title='CNN Fear & Greed'; url='https://edition.cnn.com/markets/fear-and-greed'}
$shortcuts += [PSCustomObject]@{id=1775108856017; title='Finviz'; url='https://finviz.com'}
$shortcuts += [PSCustomObject]@{id=1775108856018; title='Whale Alert'; url='https://whale-alert.io'}
$shortcuts += [PSCustomObject]@{id=1775108856019; title='Glassnode'; url='https://glassnode.com'}
$shortcuts += [PSCustomObject]@{id=1775108856020; title='DefiLlama'; url='https://defillama.com'}

if (-not ($data.PSObject.Properties['shortcuts'])) {
    $data | Add-Member -NotePropertyName 'shortcuts' -NotePropertyValue $shortcuts
} else {
    $data.shortcuts = $shortcuts
}

$data | ConvertTo-Json -Depth 10 | Set-Content 'database.json'
Write-Host "Market successfully updated database.json"
