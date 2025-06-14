const currencyFirstEl = document.getElementById("currency-first");
const worthFirstEl = document.getElementById("worth-first");
const currencySecondEl = document.getElementById("currency-second");
const worthSecondEl = document.getElementById("worth-second");
const exchangeRateEl = document.getElementById("exchange-rate");
const swapButton = document.getElementById("swap-button");
const errorMessageEl = document.getElementById("error-message");

async function populateCurrencies() {
    try {
        const response = await fetch("https://api.frankfurter.app/currencies");
        if (!response.ok) {
            throw new Error(`Failed to fetch currencies: ${response.status}`);
        }
        const currencies = await response.json();
        for (const [code, name] of Object.entries(currencies)) {
            const option1 = new Option(`${code} - ${name}`, code);
            const option2 = new Option(`${code} - ${name}`, code);
            currencyFirstEl.add(option1);
            currencySecondEl.add(option2);
        }
        currencyFirstEl.value = "USD";
        currencySecondEl.value = "EUR";
    } catch (error) {
        console.error("Error fetching currencies:", error.message);
        errorMessageEl.textContent = `Failed to load currencies: ${error.message}. Please refresh the page.`;
        errorMessageEl.classList.remove("hidden");
    }
}

async function fetchRate(fromCurrency, toCurrency, retries = 3, delay = 1000) {
    if (fromCurrency === toCurrency) {
        return 1.0;
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(
                `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            const rate = data.rates[toCurrency];
            if (!rate) {
                throw new Error("Invalid currency data");
            }
            return rate;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            if (attempt === retries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function updateRate() {
    try {
        exchangeRateEl.textContent = "Loading exchange rate...";
        errorMessageEl.classList.add("hidden");

        const fromCurrency = currencyFirstEl.value;
        const toCurrency = currencySecondEl.value;
        const rate = await fetchRate(fromCurrency, toCurrency);

        exchangeRateEl.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
        worthSecondEl.value = (worthFirstEl.value * rate).toFixed(2);
    } catch (error) {
        console.error("Error fetching exchange rate:", error.message);
        exchangeRateEl.textContent = "Error loading rate";
        let errorMsg = `Failed to fetch exchange rate: ${error.message}. Please try again.`;
        if (error.message.includes("422")) {
            errorMsg = "Invalid currency selection. Please choose different currencies.";
        }
        errorMessageEl.textContent = errorMsg;
        errorMessageEl.classList.remove("hidden");
    }
}

function swapCurrencies() {
    const temp = currencyFirstEl.value;
    currencyFirstEl.value = currencySecondEl.value;
    currencySecondEl.value = temp;
    updateRate();
}

// Event listeners
currencyFirstEl.addEventListener("change", updateRate);
currencySecondEl.addEventListener("change", updateRate);
worthFirstEl.addEventListener("input", updateRate);
swapButton.addEventListener("click", swapCurrencies);

// Initialize
async function init() {
    await populateCurrencies();
    await updateRate();
}
init();