const currencyFirstEl = document.getElementById("currency-first");
const worthFirstEl = document.getElementById("worth-first");
const currencySecondEl = document.getElementById("currency-second");
const worthSecondEl = document.getElementById("worth-second");
const exchangeRateEl = document.getElementById("exchange-rate");
const swapButton = document.getElementById("swap-button");
const errorMessageEl = document.getElementById("error-message");

async function updateRate() {
    try {
        exchangeRateEl.textContent = "Loading exchange rate...";
        errorMessageEl.classList.add("hidden");

        const response = await fetch(
            `https://api.frankfurter.app/latest?from=${currencyFirstEl.value}&to=${currencySecondEl.value}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const rate = data.rates[currencySecondEl.value];

        if (!rate) {
            throw new Error("Invalid currency data");
        }

        exchangeRateEl.textContent = `1 ${currencyFirstEl.value} = ${rate.toFixed(4)} ${currencySecondEl.value}`;
        worthSecondEl.value = (worthFirstEl.value * rate).toFixed(2);
    } catch (error) {
        console.error("Error fetching exchange rate:", error.message);
        exchangeRateEl.textContent = "Error loading rate";
        errorMessageEl.textContent = `Failed to fetch exchange rate: ${error.message}. Please try again.`;
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

// Initialize with default values
updateRate();