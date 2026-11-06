/**
 * Hallmark Engineering Matrix - LLM Cost & Hardware Break-even Calculator
 */

// 1M 토큰당 가격 (USD 기준: [Input Price, Output Price])
const LLM_CATALOG = [
  {
    vendor: "Google DeepMind",
    code: "gemini-1.5-flash",
    inPerM: 0.075,
    outPerM: 0.30,
    tier: "high-throughput",
  },
  {
    vendor: "DeepSeek AI",
    code: "deepseek-v3",
    inPerM: 0.14,
    outPerM: 0.28,
    tier: "low-cost",
  },
  {
    vendor: "OpenAI",
    code: "gpt-4o-mini",
    inPerM: 0.15,
    outPerM: 0.60,
    tier: "general-fast",
  },
  {
    vendor: "Anthropic",
    code: "claude-3-5-haiku",
    inPerM: 0.80,
    outPerM: 4.00,
    tier: "speed-code",
  },
  {
    vendor: "Google DeepMind",
    code: "gemini-1.5-pro",
    inPerM: 1.25,
    outPerM: 5.00,
    tier: "long-context",
  },
  {
    vendor: "OpenAI",
    code: "gpt-4o",
    inPerM: 2.50,
    outPerM: 10.00,
    tier: "multimodal-omni",
  },
  {
    vendor: "Anthropic",
    code: "claude-3-5-sonnet",
    inPerM: 3.00,
    outPerM: 15.00,
    tier: "reasoning-swe",
  },
];

// 상태 변수
let currentCurrency = "KRW"; // 'KRW' | 'USD'
let currentPeriod = "month";  // 'month' | 'call'

// DOM 요소
const charCountInput = document.getElementById("charCount");
const charSlider = document.getElementById("charSlider");
const outputRatioSelect = document.getElementById("outputRatio");
const dailyCallsInput = document.getElementById("dailyCalls");
const callsSlider = document.getElementById("callsSlider");
const exchangeRateInput = document.getElementById("exchangeRate");
const localWattInput = document.getElementById("localWatt");

const readoutTokens = document.getElementById("readoutTokens");
const readoutRatio = document.getElementById("readoutRatio");
const readoutCalls = document.getElementById("readoutCalls");
const matrixTbody = document.getElementById("matrixTbody");
const auditContent = document.getElementById("auditContent");

const btnKRW = document.getElementById("btnKRW");
const btnUSD = document.getElementById("btnUSD");
const periodMonthly = document.getElementById("periodMonthly");
const periodCall = document.getElementById("periodCall");

// 통화 토글
btnKRW.addEventListener("click", () => {
  if (currentCurrency === "KRW") return;
  currentCurrency = "KRW";
  btnKRW.classList.add("active");
  btnUSD.classList.remove("active");
  render();
});

btnUSD.addEventListener("click", () => {
  if (currentCurrency === "USD") return;
  currentCurrency = "USD";
  btnUSD.classList.add("active");
  btnKRW.classList.remove("active");
  render();
});

// 산출 기간 토글
periodMonthly.addEventListener("click", () => {
  if (currentPeriod === "month") return;
  currentPeriod = "month";
  periodMonthly.classList.add("active");
  periodCall.classList.remove("active");
  render();
});

periodCall.addEventListener("click", () => {
  if (currentPeriod === "call") return;
  currentPeriod = "call";
  periodCall.classList.add("active");
  periodMonthly.classList.remove("active");
  render();
});

// 슬라이더 및 인풋 이벤트 바인딩
charCountInput.addEventListener("input", (e) => {
  charSlider.value = e.target.value;
  render();
});
charSlider.addEventListener("input", (e) => {
  charCountInput.value = e.target.value;
  render();
});
dailyCallsInput.addEventListener("input", (e) => {
  callsSlider.value = e.target.value;
  render();
});
callsSlider.addEventListener("input", (e) => {
  dailyCallsInput.value = e.target.value;
  render();
});
outputRatioSelect.addEventListener("change", render);
exchangeRateInput.addEventListener("input", render);
localWattInput.addEventListener("input", render);

function formatCurrency(valUSD, rateKRW) {
  if (currentCurrency === "KRW") {
    const valKRW = valUSD * rateKRW;
    if (valKRW < 10) {
      return "₩" + valKRW.toFixed(2);
    }
    return "₩" + Math.round(valKRW).toLocaleString("ko-KR");
  } else {
    if (valUSD < 0.01) {
      return "$" + valUSD.toFixed(4);
    }
    return "$" + valUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function render() {
  const chars = Math.max(50, parseFloat(charCountInput.value) || 2000);
  const ratio = parseFloat(outputRatioSelect.value) || 1.0;
  const callsPerDay = Math.max(1, parseFloat(dailyCallsInput.value) || 50);
  const exchangeRate = Math.max(500, parseFloat(exchangeRateInput.value) || 1380);
  const localWatt = Math.max(10, parseFloat(localWattInput.value) || 130);

  // 토큰 환산 (1자 = 0.85토큰 기준)
  const inputTokens = Math.round(chars * 0.85);
  const outputTokens = Math.round(inputTokens * ratio);

  // 헤더 리드아웃 갱신
  readoutTokens.textContent = `~${inputTokens.toLocaleString()} tokens`;
  readoutRatio.textContent = `${ratio.toFixed(2)}x`;
  readoutCalls.textContent = `${callsPerDay.toLocaleString()} req/day`;

  // 테이블 렌더링
  matrixTbody.innerHTML = "";
  let lowestMonthlyUSD = Infinity;
  let lowestModelCode = "";
  let highestMonthlyUSD = 0;
  let highestModelCode = "";

  LLM_CATALOG.forEach((item) => {
    const callCostUSD =
      (inputTokens / 1_000_000) * item.inPerM +
      (outputTokens / 1_000_000) * item.outPerM;
    const monthlyCostUSD = callCostUSD * callsPerDay * 30;

    if (monthlyCostUSD < lowestMonthlyUSD) {
      lowestMonthlyUSD = monthlyCostUSD;
      lowestModelCode = item.code;
    }
    if (monthlyCostUSD > highestMonthlyUSD) {
      highestMonthlyUSD = monthlyCostUSD;
      highestModelCode = item.code;
    }

    const displayCost = currentPeriod === "month" ? monthlyCostUSD : callCostUSD;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="model-code">${item.code}</span>
        <span class="model-vendor">${item.vendor}</span>
      </td>
      <td class="rate-cell">$${item.inPerM.toFixed(3)} / $${item.outPerM.toFixed(2)}</td>
      <td class="rate-cell">${formatCurrency(callCostUSD, exchangeRate)}</td>
      <td class="num-col cost-primary">${formatCurrency(displayCost, exchangeRate)}</td>
    `;
    matrixTbody.appendChild(tr);
  });

  // 로컬 전력량 및 한전 누진세 계산 (추론당 8초 부하 지속 기준)
  const monthlySeconds = callsPerDay * 30 * 8;
  const monthlyHours = monthlySeconds / 3600;
  const monthlyKWh = (localWatt * monthlyHours) / 1000;
  const monthlyElectricKRW = monthlyKWh * 215.2; // 215.2원/kWh
  const monthlyElectricUSD = monthlyElectricKRW / exchangeRate;

  auditContent.innerHTML = `
    설정된 호출 프로파일(일 ${callsPerDay}req, ${chars.toLocaleString()}자, ${ratio}x 응답) 기준:<br>
    • <strong>로컬 호스트(소비전력 ${localWatt}W) 월간 전력 비용:</strong> 
      ${formatCurrency(monthlyElectricUSD, exchangeRate)} (${monthlyKWh.toFixed(2)} kWh 소모)<br>
    • <strong>최저가 엔드포인트 (${lowestModelCode}):</strong> 
      월간 ${formatCurrency(lowestMonthlyUSD, exchangeRate)} 수준으로, 로컬 하드웨어 감가상각을 고려하지 않은 순수 전기 요금과 대등한 비용 구간에 진입합니다.<br>
    • <strong>최상위 추론 모델 (${highestModelCode}):</strong> 
      월간 ${formatCurrency(highestMonthlyUSD, exchangeRate)}가 소요되므로, 1차 정제 및 분류 작업은 ${lowestModelCode}로 오프로딩하는 투티어(Two-tier) 아키텍처가 권장됩니다.
  `;
}

// 최초 1회 렌더
render();
