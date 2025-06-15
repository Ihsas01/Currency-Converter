const currencyFirstEl = document.getElementById("currency-first");
const worthFirstEl = document.getElementById("worth-first");
const currencySecondEl = document.getElementById("currency-second");
const conversionTableEl = document.querySelector("#conversion-table tbody");
const exchangeRateEl = document.getElementById("exchange-rate");
const swapButton = document.getElementById("swap-button");
const errorMessageEl = document.getElementById("error-message");
const datePickerEl = document.getElementById("date-picker");
const themeToggleEl = document.getElementById("theme-toggle");
const favoritesButtonEl = document.getElementById("favorites-button");
const rateChartEl = document.getElementById("rate-chart");
let rateChart;

// Fallback currency list
const fallbackCurrencies = {
    AUD: "Australian Dollar",
    BGN: "Bulgarian Lev",
    BRL: "Brazilian Real",
    CAD: "Canadian Dollar",
    CHF: "Swiss Franc",
    CNY: "Chinese Yuan",
    CZK: "Czech Koruna",
    DKK: "Danish Krone",
    EUR: "Euro",
    GBP: "British Pound",
    HKD: "Hong Kong Dollar",
    HUF: "Hungarian Forint",
    IDR: "Indonesian Rupiah",
    ILS: "Israeli New Shekel",
    INR: "Indian Rupee",
    ISK: "Icelandic Króna",
    JPY: "Japanese Yen",
    KRW: "South Korean Won",
    LKR: "Sri Lankan Rupee",
    MXN: "Mexican Peso",
    MYR: "Malaysian Ringgit",
    NOK: "Norwegian Krone",
    NZD: "New Zealand Dollar",
    PHP: "Philippine Peso",
    PLN: "Polish Zloty",
    RON: "Romanian Leu",
    SAR: "Saudi Riyal",
    SEK: "Swedish Krona",
    SGD: "Singapore Dollar",
    THB: "Thai Baht",
    TRY: "Turkish Lira",
    USD: "United States Dollar",
    ZAR: "South African Rand"
};

// Initialize Choices.js
const choicesFirst = new Choices(currencyFirstEl, {
    searchEnabled: true,
    itemSelectText: '',
    shouldSort: false,
    allowHTML: true
});
const choicesSecond = new Choices(currencySecondEl, {
    searchEnabled: true,
    itemSelectText: '',
    shouldSort: false,
    allowHTML: true
});

// API and Data Functions
async function fetchCurrencies() {
    try {
        const response = await fetch("https://api.frankfurter.app/currencies");
        if (!response.ok) throw new Error(`Failed to fetch currencies: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching currencies:", error.message);
        showError(`Failed to load currencies: ${error.message}. Using fallback currencies.`);
        return fallbackCurrencies;
    }
}

async function fetchRate(fromCurrency, toCurrency, date = 'latest', retries = 3, delay = 1000) {
    if (fromCurrency === toCurrency) return 1.0;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(
                `https://api.frankfurter.app/${date}?from=${fromCurrency}&to=${toCurrency}`
            );
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            const rate = data.rates[toCurrency];
            if (!rate) throw new Error("Invalid currency data");
            return rate;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function fetchHistoricalRates(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        console.log("Skipping historical rates fetch: same currency pair");
        return [];
    }
    try {
        const endDate = new Date("2025-06-14");
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 30);
        const response = await fetch(
            `https://api.frankfurter.app/${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}?from=${fromCurrency}&to=${toCurrency}`
        );
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        return Object.entries(data.rates).map(([date, rates]) => ({
            date,
            rate: rates[toCurrency]
        }));
    } catch (error) {
        console.error("Error fetching historical rates:", error.message);
        showError(`Failed to fetch historical rates: ${error.message}. Please try a different currency pair.`);
        return [];
    }
}

// UI Update Functions
async function populateCurrencies() {
    const currencies = await fetchCurrencies();
    const favorites = JSON.parse(localStorage.getItem("favoriteCurrencies") || "[]");
    const currencyOptions = Object.entries(currencies)
        .sort(([codeA], [codeB]) => {
            const isFavA = favorites.includes(codeA);
            const isFavB = favorites.includes(codeB);
            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;
            return codeA.localeCompare(codeB);
        })
        .map(([code, name]) => ({
            value: code,
            label: `<img src="https://flagcdn.com/16x12/${code.slice(0, 2).toLowerCase()}.png" alt="${code} flag" class="flag-icon"> ${code} - ${name}`,
            customProperties: { isFavorite: favorites.includes(code) }
        }));

    choicesFirst.setChoices(currencyOptions, 'value', 'label', true);
    choicesSecond.setChoices(currencyOptions, 'value', 'label', true);
    choicesFirst.setChoiceByValue("USD");
    choicesSecond.setChoiceByValue("EUR");
}

async function updateRate() {
    try {
        exchangeRateEl.textContent = "Loading exchange rate...";
        exchangeRateEl.classList.add("loading");
        errorMessageEl.classList.add("hidden");
        conversionTableEl.innerHTML = "";

        const fromCurrency = currencyFirstEl.value;
        const toCurrency = currencySecondEl.value || "EUR";
        const date = datePickerEl.value || 'latest';
        const amount = parseFloat(worthFirstEl.value) || 1;

        if (amount <= 0) {
            throw new Error("Amount must be greater than 0");
        }

        const rate = await fetchRate(fromCurrency, toCurrency, date);
        const converted = (amount * rate).toFixed(2);

        exchangeRateEl.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}${date !== 'latest' ? ` (on ${date})` : ''}`;
        exchangeRateEl.classList.remove("loading");

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${toCurrency}</td>
            <td>${converted}</td>
            <td>${rate.toFixed(4)}</td>
        `;
        conversionTableEl.appendChild(row);

        if (date === 'latest' && fromCurrency !== toCurrency) {
            const historicalRates = await fetchHistoricalRates(fromCurrency, toCurrency);
            updateChart(historicalRates, fromCurrency, toCurrency);
        } else {
            rateChart && rateChart.destroy();
        }
    } catch (error) {
        console.error("Error fetching exchange rate:", error.message);
        exchangeRateEl.textContent = "Error loading rate";
        exchangeRateEl.classList.remove("loading");
        let errorMsg = `Failed to fetch exchange rate: ${error.message}. Please try again.`;
        if (error.message.includes("422")) {
            errorMsg = "Invalid currency selection or date. Please select different currencies or check the date.";
        }
        showError(errorMsg);
    }
}

function updateChart(historicalRates, fromCurrency, toCurrency) {
    if (rateChart) rateChart.destroy();
    if (historicalRates.length === 0) return;

    rateChart = new Chart(rateChartEl, {
        type: 'line',
        data: {
            labels: historicalRates.map(({ date }) => date),
            datasets: [{
                label: `${fromCurrency}/${toCurrency}`,
                data: historicalRates.map(({ rate }) => rate),
                borderColor: '#a0c4ff',
                backgroundColor: 'rgba(160, 196, 255, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                zoom: {
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'xy'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Date', font: { size: 14 } } },
                y: { title: { display: true, text: 'Exchange Rate', font: { size: 14 } } }
            }
        }
    });
}

function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.classList.remove("hidden");
    setTimeout(() => errorMessageEl.classList.add("hidden"), 5000);
}

function swapCurrencies() {
    const temp = currencyFirstEl.value;
    choicesFirst.setChoiceByValue(currencySecondEl.value || "EUR");
    choicesSecond.setChoiceByValue(temp);
    updateRate();
}

function toggleTheme() {
    const themes = ["light-theme", "dark-theme", "auto-theme"];
    const currentTheme = document.body.classList[0];
    const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
    document.body.classList.remove(...themes);
    document.body.classList.add(nextTheme);
    localStorage.setItem("theme", nextTheme);
}

function toggleFavorite() {
    const favorites = JSON.parse(localStorage.getItem("favoriteCurrencies") || "[]");
    const fromCurrency = currencyFirstEl.value;
    const toCurrency = currencySecondEl.value;
    const selectedCurrencies = [fromCurrency, toCurrency].filter(Boolean);

    selectedCurrencies.forEach(code => {
        if (favorites.includes(code)) {
            favorites.splice(favorites.indexOf(code), 1);
        } else if (favorites.length < 10) {
            favorites.push(code);
        }
    });

    localStorage.setItem("favoriteCurrencies", JSON.stringify(favorites));
    populateCurrencies();
    showError(`Favorites updated: ${favorites.join(", ") || "None"}`);
}

// Mock WebSocket for real-time updates
function startMockWebSocket() {
    setInterval(async () => {
        if (!datePickerEl.value) {
            await updateRate();
            showError("Rates updated in real-time");
        }
    }, 30000);
}

// Event Listeners
currencyFirstEl.addEventListener("change", updateRate);
currencySecondEl.addEventListener("change", updateRate);
worthFirstEl.addEventListener("input", () => {
    if (worthFirstEl.value < 0) worthFirstEl.value = 0;
    updateRate();
});
datePickerEl.addEventListener("change", updateRate);
swapButton.addEventListener("click", swapCurrencies);
themeToggleEl.addEventListener("click", toggleTheme);
favoritesButtonEl.addEventListener("click", toggleFavorite);

// Auto-refresh rates every 60 seconds
let rateInterval;
function startAutoRefresh() {
    clearInterval(rateInterval);
    if (!datePickerEl.value) {
        rateInterval = setInterval(updateRate, 60000);
    }
}
datePickerEl.addEventListener("change", () => {
    if (!datePickerEl.value) startAutoRefresh();
    else clearInterval(rateInterval);
});

// Initialize
async function init() {
    const savedTheme = localStorage.getItem("theme") || "auto";
    document.body.classList.add(`${savedTheme}-theme`);
    document.querySelector(".container").classList.remove("hidden");

    await populateCurrencies();
    await updateRate();
    startAutoRefresh();
    startMockWebSocket();
}
init();