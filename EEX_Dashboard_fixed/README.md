EEX/EPEX Day-Ahead Dashboard

GitHub Actions fetches the Energy-Charts data hourly and writes data.json.
The browser reads only data.json, so the GitHub Pages site does not need
direct browser access to the Energy-Charts API and therefore avoids the CORS
problem.
