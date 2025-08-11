Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  구독 간편조회 개발 서버 시작" -ForegroundColor Yellow
Write-Host "  자동 재시작 모드 (nodemon)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[변경 감지 대상]" -ForegroundColor Green
Write-Host "- 서버 파일 (*.js)"
Write-Host "- HTML 파일 (*.html)"
Write-Host "- CSS 파일 (*.css)"
Write-Host "- JSON 파일 (*.json)"
Write-Host ""
Write-Host "[서버 정보]" -ForegroundColor Green
Write-Host "- 포트: 3008"
Write-Host "- 주소: http://localhost:3008"
Write-Host ""
Write-Host "종료하려면 Ctrl+C를 두 번 누르세요." -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm run dev