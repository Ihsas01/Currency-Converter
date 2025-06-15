Pro Currency Converter
 
A sleek, modern web app for real-time currency conversion, powered by the Frankfurter API. Convert currencies, view historical rates, and enjoy a responsive, user-friendly interface.
✨ Features

Real-Time Conversion: Convert between currencies with live rates.
Single Currency Pair: Select one "From" and one "To" currency.
Historical Trends: View 30-day rate charts with zoom and tooltips.
Favorites: Save up to 10 currencies for quick access.
Auto-Updates: Rates refresh every 30 seconds.
Themes: Light, dark, or auto theme switching.
Responsive: Beautiful on desktop, tablet, and mobile.
Error Handling: Clear messages for invalid inputs or API issues.

🛠️ Setup

Clone or Download:
git clone <repository-url>
cd pro-currency-converter


Serve Locally:

Use a local server (e.g., Live Server in VS Code or http-server):npm install -g http-server
http-server .


Open http://localhost:8080 in your browser.


Dependencies:

Loaded via CDN: Choices.js, Chart.js, chartjs-plugin-zoom.
Requires internet for API and CDN access.



📂 Files

index.html: Main structure
index.js: Core logic
style.css: Styling

🚀 Usage

Convert: Pick "From" and "To" currencies, enter an amount.
History: Select a date for past rates (up to June 14, 2025).
Favorites: Click ⭐ to save currencies.
Swap: Use 🔄 to switch currencies.
Theme: Toggle 🌙 for light/dark/auto modes.

⚠️ Notes

Same-currency pairs (e.g., AUD to AUD) show 1:1 rates without charts.
Real-time updates use polling (no WebSocket support in Frankfurter API).

🔮 Future Enhancements

Multi-currency conversion.
Custom chart time ranges.
Local rate caching for offline use.

📜 License
MIT License. See LICENSE for details.
🙌 Credits

Frankfurter API
Choices.js
Chart.js
chartjs-plugin-zoom

