let priceChart = null;


/* =========================================================
   Hilfsfunktionen
   ========================================================= */


/*
 * Aktuellsten Wert bis zu einem bestimmten Zeitpunkt finden.
 *
 * Wichtig:
 * Day-Ahead enthält auch zukünftige Werte.
 * Deshalb darf nicht einfach der allerletzte Wert
 * der Datenreihe verwendet werden.
 */
function findLatestBefore(data, timestamp) {

    if (!data || !data.length) {
        return null;
    }

    const valid = data
        .filter(
            point =>
                point.timestamp <= timestamp
        )
        .sort(
            (a, b) =>
                a.timestamp - b.timestamp
        );

    if (!valid.length) {
        return null;
    }

    return valid[valid.length - 1];
}


/*
 * Preis formatieren
 */
function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return "–";
    }

    return (
        Number(value).toLocaleString(
            "de-DE",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ) + " €/MWh"
    );
}


/*
 * Datum / Uhrzeit formatieren
 */
function formatDateTime(timestamp) {

    return new Date(
        timestamp
    ).toLocaleString(
        "de-DE",
        {
            timeZone: "Europe/Berlin",

            day: "2-digit",
            month: "2-digit",
            year: "numeric",

            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/*
 * Zeitachse formatieren
 */
function formatAxisLabel(timestamp) {

    return new Date(
        timestamp
    ).toLocaleString(
        "de-DE",
        {
            timeZone: "Europe/Berlin",

            day: "2-digit",
            month: "2-digit",

            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/*
 * Prüfen, ob ein Timestamp heute ist
 */
function isToday(timestamp) {

    const date = new Date(timestamp);

    const today = new Date();

    return (
        date.toLocaleDateString(
            "de-DE",
            {
                timeZone: "Europe/Berlin"
            }
        )
        ===
        today.toLocaleDateString(
            "de-DE",
            {
                timeZone: "Europe/Berlin"
            }
        )
    );
}


/* =========================================================
   Daten laden
   ========================================================= */

async function loadData() {

    try {

        const response = await fetch(
            "data.json?ts=" + Date.now(),
            {
                cache: "no-store"
            }
        );


        if (!response.ok) {

            throw new Error(
                "data.json konnte nicht geladen werden."
            );

        }


        const json =
            await response.json();


        if (
            !json.day_ahead ||
            !json.intraday
        ) {

            throw new Error(
                "Day-Ahead- oder Intraday-Daten fehlen."
            );

        }


        const dayAhead =
            json.day_ahead;

        const intraday =
            json.intraday;


        if (
            dayAhead.length === 0 &&
            intraday.length === 0
        ) {

            throw new Error(
                "Keine Preisdaten vorhanden."
            );

        }


        console.log(
            "Day Ahead:",
            dayAhead.length,
            "Punkte"
        );

        console.log(
            "Intraday:",
            intraday.length,
            "Punkte"
        );


        /* =====================================================
           Zeitbereich bestimmen
           ===================================================== */

        const allTimestamps = [

            ...dayAhead.map(
                x => x.timestamp
            ),

            ...intraday.map(
                x => x.timestamp
            )

        ];


        const minTimestamp =
            Math.min(
                ...allTimestamps
            );


        const maxTimestamp =
            Math.max(
                ...allTimestamps
            );


        /*
         * 15-Minuten-Raster
         */
        const stepMs =
            15 * 60 * 1000;


        const timestamps = [];


        /*
         * Auf den nächsten 15-Minuten-Punkt runden
         */
        const firstTimestamp =
            Math.floor(
                minTimestamp / stepMs
            ) * stepMs;


        for (
            let timestamp = firstTimestamp;
            timestamp <= maxTimestamp;
            timestamp += stepMs
        ) {

            timestamps.push(
                timestamp
            );

        }


        /* =====================================================
           Daten Maps
           ===================================================== */

        const dayAheadMap =
            new Map(
                dayAhead.map(
                    point => [
                        point.timestamp,
                        point.price
                    ]
                )
            );


        const intradayMap =
            new Map(
                intraday.map(
                    point => [
                        point.timestamp,
                        point.price
                    ]
                )
            );


        /* =====================================================
           Datenreihen
           ===================================================== */

        const dayAheadValues =
            timestamps.map(
                timestamp => {

                    const value =
                        dayAheadMap.get(
                            timestamp
                        );

                    return (
                        value !== undefined
                        ? value
                        : null
                    );

                }
            );


        const intradayValues =
            timestamps.map(
                timestamp => {

                    const value =
                        intradayMap.get(
                            timestamp
                        );

                    return (
                        value !== undefined
                        ? value
                        : null
                    );

                }
            );


        /* =====================================================
           Labels
           ===================================================== */

        const labels =
            timestamps.map(
                timestamp =>
                    formatAxisLabel(
                        timestamp
                    )
            );


        /* =====================================================
           Aktuelle Werte
           ===================================================== */

        const nowTimestamp =
            Date.now();


        const currentIntraday =
            findLatestBefore(
                intraday,
                nowTimestamp
            );


        const currentDayAhead =
            findLatestBefore(
                dayAhead,
                nowTimestamp
            );


        /* -----------------------------------------------------
           Aktueller Intraday
           ----------------------------------------------------- */

        const currentIntradayElement =
            document.getElementById(
                "currentIntraday"
            );


        const currentIntradayTimeElement =
            document.getElementById(
                "currentIntradayTime"
            );


        if (currentIntraday) {

            currentIntradayElement.textContent =
                formatPrice(
                    currentIntraday.price
                );


            currentIntradayTimeElement.textContent =
                formatDateTime(
                    currentIntraday.timestamp
                );

        }


        /* -----------------------------------------------------
           Aktueller Day Ahead
           ----------------------------------------------------- */

        const currentDayAheadElement =
            document.getElementById(
                "currentDayAhead"
            );


        const currentDayAheadTimeElement =
            document.getElementById(
                "currentDayAheadTime"
            );


        if (currentDayAhead) {

            currentDayAheadElement.textContent =
                formatPrice(
                    currentDayAhead.price
                );


            currentDayAheadTimeElement.textContent =
                formatDateTime(
                    currentDayAhead.timestamp
                );

        }


        /* =====================================================
           Spread
           ===================================================== */

        const spreadElement =
            document.getElementById(
                "currentSpread"
            );


        if (
            currentIntraday &&
            currentDayAhead
        ) {

            const spread =
                currentIntraday.price
                -
                currentDayAhead.price;


            spreadElement.textContent =
                formatPrice(
                    spread
                );

        }


        /* =====================================================
           Tagesmittel Intraday
           ===================================================== */

        const todayValues =
            intraday
                .filter(
                    point =>
                        isToday(
                            point.timestamp
                        )
                )
                .map(
                    point =>
                        point.price
                );


        const todayAverageElement =
            document.getElementById(
                "todayAverage"
            );


        if (todayValues.length) {

            const average =
                todayValues.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                )
                /
                todayValues.length;


            todayAverageElement.textContent =
                formatPrice(
                    average
                );

        }


        /* =====================================================
           Aktualisierungszeit
           ===================================================== */

        const updateTimeElement =
            document.getElementById(
                "updateTime"
            );


        if (
            json.generated_at
        ) {

            updateTimeElement.textContent =
                new Date(
                    json.generated_at
                ).toLocaleString(
                    "de-DE",
                    {
                        timeZone:
                            "Europe/Berlin",

                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",

                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

        }


        /* =====================================================
           Chart
           ===================================================== */

        const canvas =
            document.getElementById(
                "priceChart"
            );


        if (!canvas) {

            throw new Error(
                "Canvas 'priceChart' wurde nicht gefunden."
            );

        }


        const ctx =
            canvas.getContext(
                "2d"
            );


        /*
         * Alten Chart löschen,
         * falls die Seite neu geladen wird.
         */
        if (priceChart) {

            priceChart.destroy();

        }


        priceChart =
            new Chart(
                ctx,
                {

                    type: "line",

                    data: {

                        labels: labels,

                        datasets: [

                            {
                                label:
                                    "Intraday kontinuierlich, 15 Minuten Durchschnittspreis (DE-LU)",

                                data:
                                    intradayValues,

                                borderColor:
                                    "#f39c12",

                                backgroundColor:
                                    "transparent",

                                borderWidth:
                                    2,

                                pointRadius:
                                    0,

                                pointHoverRadius:
                                    5,

                                stepped:
                                    true,

                                spanGaps:
                                    false
                            },


                            {
                                label:
                                    "Day Ahead Auktion (DE-LU)",

                                data:
                                    dayAheadValues,

                                borderColor:
                                    "#e51c23",

                                backgroundColor:
                                    "transparent",

                                borderWidth:
                                    2,

                                pointRadius:
                                    0,

                                pointHoverRadius:
                                    5,

                                stepped:
                                    true,

                                spanGaps:
                                    false
                            }

                        ]

                    },


                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,


                        interaction: {

                            mode:
                                "index",

                            intersect:
                                false

                        },


                        plugins: {

                            legend: {

                                display:
                                    false

                            },


                            tooltip: {

                                callbacks: {

                                    title:
                                        function(items) {

                                            if (
                                                !items.length
                                            ) {
                                                return "";
                                            }

                                            return formatDateTime(
                                                timestamps[
                                                    items[0].dataIndex
                                                ]
                                            );

                                        },


                                    label:
                                        function(context) {

                                            if (
                                                context.parsed.y === null
                                            ) {
                                                return null;
                                            }


                                            return (
                                                context.dataset.label
                                                +
                                                ": "
                                                +
                                                Number(
                                                    context.parsed.y
                                                ).toFixed(2)
                                                +
                                                " €/MWh"
                                            );

                                        }

                                }

                            }

                        },


                        scales: {

                            x: {

                                ticks: {

                                    maxTicksLimit:
                                        20,

                                    maxRotation:
                                        0,

                                    minRotation:
                                        0

                                },

                                grid: {

                                    color:
                                        "#e5e7eb"

                                }

                            },


                            y: {

                                title: {

                                    display:
                                        true,

                                    text:
                                        "Preis (€/MWh)"

                                },

                                grid: {

                                    color:
                                        "#e5e7eb"

                                }

                            }

                        }

                    }

                }
            );


    } catch (error) {

        console.error(
            error
        );


        const updateTime =
            document.getElementById(
                "updateTime"
            );


        if (updateTime) {

            updateTime.textContent =
                "Fehler beim Laden";

        }


        const chartContainer =
            document.querySelector(
                ".chart-container"
            );


        if (chartContainer) {

            chartContainer.innerHTML = `
                <div style="
                    padding:40px;
                    text-align:center;
                    color:#b91c1c;
                ">
                    ${error.message}
                </div>
            `;

        }

    }

}


/* =========================================================
   Start
   ========================================================= */

loadData();
