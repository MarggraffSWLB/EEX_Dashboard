name: Update electricity prices

on:
  workflow_dispatch:

  schedule:
    - cron: "7,22,37,52 * * * *"

permissions:
  contents: write

jobs:
  update-data:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install Python packages
        run: |
          python -m pip install --upgrade pip
          pip install playwright

      - name: Install Chromium
        run: |
          playwright install --with-deps chromium

      - name: Fetch Energy-Charts data
        shell: python
        run: |
          import json
          import datetime as dt
          from pathlib import Path
          from zoneinfo import ZoneInfo

          from playwright.sync_api import sync_playwright


          # ---------------------------------------------------------
          # Einstellungen
          # ---------------------------------------------------------

          TZ = ZoneInfo("Europe/Berlin")

          now = dt.datetime.now(TZ)

          # 3 Kalendertage inklusive heute:
          #
          # z.B.
          # 31.08.
          # 01.09.
          # 02.09.
          #
          # plus morgen:
          # 03.09.
          start_date = now.date() - dt.timedelta(days=2)
          end_date = now.date() + dt.timedelta(days=1)


          # ---------------------------------------------------------
          # Energy-Charts
          # ---------------------------------------------------------

          url = (
              "https://www.energy-charts.info/"
              "charts/price_spot_market/chart.htm"
              "?l=de"
              "&c=DE"
              "&interval=week"
              "&minuteInterval=15min"
              "&timeslider=0"
          )

          print("Loading Energy-Charts:")
          print(url)


          # ---------------------------------------------------------
          # Energy-Charts mit Chromium öffnen
          # ---------------------------------------------------------

          with sync_playwright() as p:

              browser = p.chromium.launch(
                  headless=True
              )

              page = browser.new_page(
                  viewport={
                      "width": 1600,
                      "height": 1000
                  }
              )

              page.goto(
                  url,
                  wait_until="domcontentloaded",
                  timeout=120000
              )

              # Warten, bis Highcharts vorhanden ist
              page.wait_for_function(
                  """
                  () =>
                      window.Highcharts &&
                      window.Highcharts.charts &&
                      window.Highcharts.charts.length > 0
                  """,
                  timeout=120000
              )

              # Energy-Charts etwas Zeit zum Laden der Daten geben
              page.wait_for_timeout(10000)


              # -----------------------------------------------------
              # Daten aus Highcharts auslesen
              # -----------------------------------------------------

              result = page.evaluate(
                  """
                  () => {

                      const charts =
                          window.Highcharts &&
                          window.Highcharts.charts
                          ? window.Highcharts.charts
                          : [];


                      const dayAheadName =
                          "Day Ahead Auktion (DE-LU)";


                      const intradayName =
                          "Intraday kontinuierlich, 15 Minuten Durchschnittspreis (DE-LU)";


                      // Nicht einfach den ersten Chart nehmen.
                      // Wir suchen gezielt den Chart, der unsere
                      // beiden benötigten Serien enthält.

                      const chart = charts.find(
                          c =>
                              c &&
                              c.series &&
                              c.series.some(
                                  s => s.name === dayAheadName
                              ) &&
                              c.series.some(
                                  s => s.name === intradayName
                              )
                      );


                      if (!chart) {

                          return {
                              error:
                                  "Chart mit Day-Ahead und Intraday Serie nicht gefunden",

                              availableCharts:
                                  charts.map(
                                      c =>
                                          c &&
                                          c.series
                                          ? c.series.map(
                                              s => s.name
                                          )
                                          : []
                                  )
                          };

                      }


                      return {

                          series:
                              chart.series.map(
                                  s => ({

                                      name: s.name,

                                      data:
                                          s.data.map(
                                              p => ({

                                                  x: p.x,

                                                  y: p.y

                                              })
                                          )

                                  })
                              )

                      };

                  }
                  """
              )


              browser.close()


          # ---------------------------------------------------------
          # Prüfen
          # ---------------------------------------------------------

          if "error" in result:

              print("ERROR:")
              print(result["error"])

              print("")
              print("Available charts:")

              for chart in result.get(
                  "availableCharts",
                  []
              ):
                  print(chart)

              raise Exception(
                  result["error"]
              )


          print("")
          print("Gefundene Serien:")
          print("")


          for series in result["series"]:

              print(
                  series["name"],
                  "->",
                  len(series["data"]),
                  "Punkte"
              )


          # ---------------------------------------------------------
          # Gewünschte Serien suchen
          # ---------------------------------------------------------

          day_ahead_name = (
              "Day Ahead Auktion (DE-LU)"
          )

          intraday_name = (
              "Intraday kontinuierlich, "
              "15 Minuten Durchschnittspreis "
              "(DE-LU)"
          )


          day_ahead = None
          intraday = None


          for series in result["series"]:

              if series["name"] == day_ahead_name:

                  day_ahead = series["data"]


              if series["name"] == intraday_name:

                  intraday = series["data"]


          if day_ahead is None:

              raise Exception(
                  "Day-Ahead-Serie nicht gefunden"
              )


          if intraday is None:

              raise Exception(
                  "Intraday-Serie nicht gefunden"
              )


          # ---------------------------------------------------------
          # Zeitfenster definieren
          # ---------------------------------------------------------

          start_ts = int(
              dt.datetime.combine(
                  start_date,
                  dt.time.min,
                  tzinfo=TZ
              ).timestamp()
          )


          end_ts = int(
              dt.datetime.combine(
                  end_date,
                  dt.time.max,
                  tzinfo=TZ
              ).timestamp()
          )


          # ---------------------------------------------------------
          # Daten bereinigen
          # ---------------------------------------------------------

          def clean(data):

              cleaned = []

              for point in data:

                  if point["x"] is None:
                      continue

                  if point["y"] is None:
                      continue


                  # Highcharts verwendet Millisekunden.
                  timestamp = int(
                      point["x"] / 1000
                  )


                  if timestamp < start_ts:
                      continue

                  if timestamp > end_ts:
                      continue


                  cleaned.append(
                      {
                          "timestamp": timestamp,
                          "price": float(point["y"])
                      }
                  )


              # Nach Zeit sortieren
              cleaned.sort(
                  key=lambda x: x["timestamp"]
              )


              # Doppelte Zeitpunkte entfernen
              unique = {}

              for point in cleaned:

                  unique[
                      point["timestamp"]
                  ] = point["price"]


              return [
                  {
                      "timestamp": timestamp,
                      "price": price
                  }

                  for timestamp, price
                  in sorted(unique.items())
              ]


          day_ahead_clean = clean(
              day_ahead
          )

          intraday_clean = clean(
              intraday
          )


          # ---------------------------------------------------------
          # Ergebnis schreiben
          # ---------------------------------------------------------

          output = {

              "generated_at":
                  now.isoformat(),

              "timezone":
                  "Europe/Berlin",

              "start":
                  start_date.isoformat(),

              "end":
                  end_date.isoformat(),

              "day_ahead":
                  day_ahead_clean,

              "intraday":
                  intraday_clean

          }


          Path(
              "data.json"
          ).write_text(

              json.dumps(
                  output,
                  ensure_ascii=False,
                  separators=(",", ":")
              ),

              encoding="utf-8"

          )


          # ---------------------------------------------------------
          # Kontrolle
          # ---------------------------------------------------------

          print("")
          print("====================================")
          print("Update erfolgreich")
          print("====================================")
          print(
              "Zeitraum:",
              start_date,
              "bis",
              end_date
          )

          print(
              "Day Ahead Punkte:",
              len(day_ahead_clean)
          )

          print(
              "Intraday Punkte:",
              len(intraday_clean)
          )

          print(
              "Data.json geschrieben."
          )


      - name: Commit updated data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git add data.json

          git diff --cached --quiet || \
            git commit -m "Update electricity prices"

          git push
