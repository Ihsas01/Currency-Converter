const currencyFirstEl = document.getElementById("currency-first");
const worthFirstEl = document.getElementById("worth-first");
const currencySecondEl = document.getElementById("currency-second");
const conversionTableEl = document.querySelector("#conversion-table tbody");
const exchangeRateEl = document.getElementById("exchange-rate");
const swapButton = document.getElementById("swap-button");
const errorMessageEl = document.getElementById("error-message");
const datePickerEl = document.getElementById("date-picker");
const themeToggleEl = document.getElementById("theme-toggle");
let rateChart;

// Comprehensive fallback currency list
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

// Initialize Choices.js for searchable dropdowns
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
    maxItemCount: 5,
    allowHTML: true
});

async function populateCurrencies() {
    try {
        console.log("Fetching currencies from API...");
        const response = await fetch("https://api.frankfurter.app/currencies");
        if (!response.ok) throw new Error(`Failed to fetch currencies: ${response.status}`);
        const currencies = await response.json();
        console.log("Currencies fetched:", currencies);

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
        choicesSecond.setChoiceByValue(["EUR", "LKR", "SAR"]);
        console.log("Dropdowns populated with", currencyOptions.length, "currencies");
    } catch (error) {
        console.error("Error fetching currencies:", error.message);
        showError(`Failed to load currencies: ${error.message}. Using fallback currencies.`);

        const favorites = JSON.parse(localStorage.getItem("favoriteCurrencies") || "[]");
        const fallbackOptions = Object.entries(fallbackCurrencies)
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

        choicesFirst.setChoices(fallbackOptions, 'value', 'label', true);
        choicesSecond.setChoices(fallbackOptions, 'value', 'label', true);
        choicesFirst.setChoiceByValue("USD");
        choicesSecond.setChoiceByValue(["EUR", "LKR", "SAR"]);
        console.log("Fallback dropdowns populated with", fallbackOptions.length, "currencies");
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
    try {
        const endDate = new Date("2025-06-14");
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
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
        return [];
    }
}

async function updateRate() {
    try {
        exchangeRateEl.textContent = "Loading exchange rate...";
        exchangeRateEl.classList.add("loading");
        errorMessageEl.classList.add("hidden");
        conversionTableEl.innerHTML = "";

        const fromCurrency = currencyFirstEl.value;
        let toCurrencies = Array.isArray(currencySecondEl.value) ? currencySecondEl.value : (currencySecondEl.value ? [currencySecondEl.value] : ["EUR"]);
        if (toCurrencies.length === 0) {
            toCurrencies = ["EUR"];
            choicesSecond.setChoiceByValue(["EUR"]);
        }
        const date = datePickerEl.value || 'latest';
        const amount = parseFloat(worthFirstEl.value) || 1;

        const rates = await Promise.all(
            toCurrencies.map(async (toCurrency) => {
                const rate = await fetchRate(fromCurrency, toCurrency, date);
                return { toCurrency, rate, converted: (amount * rate).toFixed(2) };
            })
        );

        exchangeRateEl.textContent = rates
            .map(({ toCurrency, rate }) => `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}${date !== 'latest' ? ` (on ${date})` : ''}`)
            .join(" | ");
        exchangeRateEl.classList.remove("loading");

        rates.forEach(({ toCurrency, converted }) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${toCurrency}</td>
                <td>${converted}</td>
            `;
            conversionTableEl.appendChild(row);
        });

        // Update chart for the first selected currency
        if (toCurrencies.length > 0 && date === 'latest') {
            const historicalRates = await fetchHistoricalRates(fromCurrency, toCurrencies[0]);
            updateChart(historicalRates, fromCurrency, toCurrencies[0]);
        } else {
            rateChart && rateChart.destroy();
        }
    } catch (error) {
        console.error("Error fetching exchange rate:", error.message);
        exchangeRateEl.textContent = "Error loading rate";
        exchangeRateEl.classList.remove("loading");
        let errorMsg = `Failed to fetch exchange rate: ${error.message}. Please try again.`;
        if (error.message.includes("422")) {
            errorMsg = "Invalid currency selection or date. Please check your inputs.";
        }
        showError(errorMsg);
    }
}

function updateChart(historicalRates, fromCurrency, toCurrency) {
    if (rateChart) rateChart.destroy();
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
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'Exchange Rate' } }
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
    const toCurrencies = Array.isArray(currencySecondEl.value) ? currencySecondEl.value : (currencySecondEl.value ? [currencySecondEl.value] : ["EUR"]);
    choicesFirst.setChoiceByValue(toCurrencies[0] || "EUR");
    choicesSecond.setChoiceByValue([temp]);
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

// Event listeners
currencyFirstEl.addEventListener("change", updateRate);
currencySecondEl.addEventListener("change", updateRate);
worthFirstEl.addEventListener("input", updateRate);
datePickerEl.addEventListener("change", updateRate);
swapButton.addEventListener("click", swapCurrencies);
themeToggleEl.addEventListener("click", toggleTheme);

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
    // Load saved theme
    const savedTheme = localStorage.getItem("theme") || "auto";
    document.body.classList.add(`${savedTheme}-theme`);

    // Show container with animation
    document.querySelector(".container").classList.remove("hidden");

    await populateCurrencies();
    await updateRate();
    startAutoRefresh();
}
init();