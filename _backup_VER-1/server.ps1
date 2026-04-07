$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:8085/")
$listener.Prefixes.Add("http://localhost:8085/")
$listener.Start()
Write-Host "백엔드 API 서버 작동 시작: http://127.0.0.1:8085/ (종료하려면 Ctrl+C 입력)"

$dbPath = Join-Path (Get-Location) "database.json"

if (!(Test-Path $dbPath)) {
    $initData = '{"usersDB":[], "categories":[], "items":[], "newsData":[]}'
    [System.IO.File]::WriteAllText($dbPath, $initData, [System.Text.Encoding]::UTF8)
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $requestUrl = $request.Url.LocalPath
        
        $response.AppendHeader("Access-Control-Allow-Origin", "*")
        $response.AppendHeader("Access-Control-Allow-Headers", "Content-Type")
        $response.AppendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        
        if ($request.HttpMethod -eq "OPTIONS") {
             $response.StatusCode = 200
             $response.OutputStream.Close()
             continue
        }

        Write-Host "로그: [$($request.HttpMethod)] $($requestUrl)" -ForegroundColor Gray
        
        if ($requestUrl -eq "/api/data") {
            try {
                if ($request.HttpMethod -eq "GET") {
                    $jsonContent = [System.IO.File]::ReadAllText($dbPath, [System.Text.Encoding]::UTF8)
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } elseif ($request.HttpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $body = $reader.ReadToEnd()
                    $reader.Close()
                    
                    if (![string]::IsNullOrWhiteSpace($body)) {
                        [System.IO.File]::WriteAllText($dbPath, $body, [System.Text.Encoding]::UTF8)
                        $resString = '{"success":true}'
                        $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resString)
                        $response.ContentType = "application/json; charset=utf-8"
                        $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                        Write-Host "데이터 저장 완료" -ForegroundColor Green
                    }
                }
            } catch {
                Write-Host "데이터 처리 오류: $($_.Exception.Message)" -ForegroundColor Red
                $response.StatusCode = 500
            }
        } elseif ($requestUrl.StartsWith("/api/fetch-meta")) {
            $urlParam = $request.QueryString["url"]
            try {
                Write-Host "URL 수집 격리 처리 시작 (3초 타임아웃): $urlParam" -ForegroundColor Cyan
                
                # 강제 격리 수집 (Job 사용)
                $fetchJob = Start-Job -ScriptBlock {
                    param($targetUrl)
                    try {
                        # 브라우저처럼 보이도록 UserAgent 설정 및 리다이렉션 방지
                        $web = Invoke-WebRequest -Uri $targetUrl -Method Get -TimeoutSec 2 -MaximumRedirection 0 -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36" -ErrorAction Stop
                        $raw = $web.Content
                        $cut = $raw.Substring(0, [Math]::Min($raw.Length, 40960)) # 앞쪽 40KB만 파싱
                        
                        $tit = ""
                        if ($cut -match "<title[^>]*>(.*?)</title>") { $tit = $matches[1].Trim() }
                        $dec = ""
                        if ($cut -match "<meta[^>]*name=['""]description['""][^>]*content=['""](.*?)['""]" -or $cut -match "<meta[^>]*property=['""]og:description['""][^>]*content=['""](.*?)['""]") {
                            $dec = $matches[1].Trim()
                        }
                        
                        return @{ title = $tit; description = $dec } | ConvertTo-Json
                    } catch { return '{"title":"","description":""}' }
                } -ArgumentList $urlParam

                # 3초 대기 후 강제 종료 (서버 멈춤 방지 핵심)
                if (Wait-Job $fetchJob -Timeout 3) {
                    $resJson = Receive-Job $fetchJob
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                    Write-Host "정보 수집 완료" -ForegroundColor Green
                } else {
                    Stop-Job $fetchJob
                    Write-Host "정보 수집 시간 초과 (작업 강제 종료)" -ForegroundColor Yellow
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"title":"","description":""}')
                }
                Remove-Job $fetchJob
                
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                Write-Host "정보 수집 핸들러 오류: $($_.Exception.Message)" -ForegroundColor Red
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"title":"","description":""}')
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            # 정적 파일 서빙
            if ($requestUrl -eq "/") { $requestUrl = "/index.html" }
            $filePath = Join-Path (Get-Location) $requestUrl
            if (Test-Path $filePath -PathType Leaf) {
                $content = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $content.Length
                if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
                elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css" }
                elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript" }
                $response.OutputStream.Write($content, 0, $content.Length)
            } else {
                $response.StatusCode = 404
            }
        }
        $response.OutputStream.Close()
    }
} finally {
    Stop-Job -State Running
    Remove-Job -State Stopped
    $listener.Stop()
}
