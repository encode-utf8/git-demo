# 启动行情数据侧车。
# 优先使用项目专属 conda 环境 stock-analysis；找不到时回退到 PATH 中的 python。

$ErrorActionPreference = "Stop"

$condaCommand = Get-Command conda -ErrorAction SilentlyContinue
$envPython = $null

if ($condaCommand) {
  # conda.exe 通常位于 <base>/Scripts/conda.exe，向上两级得到 conda 根目录。
  $condaBase = Split-Path (Split-Path $condaCommand.Source -Parent) -Parent
  $candidate = Join-Path $condaBase "envs\stock-analysis\python.exe"
  if (Test-Path -LiteralPath $candidate) {
    $envPython = $candidate
  }
}

$python = if ($envPython) { $envPython } else { "python" }

& $python -m uvicorn app.main:app --reload --app-dir data-service --host 127.0.0.1 --port 8000
