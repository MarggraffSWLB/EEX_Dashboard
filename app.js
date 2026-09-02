async function loadData() {

    try {

        const response =
            await fetch(
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


        /*
         * Die GitHub-Action erzeugt:
         *
         * json.day_ahead
         * json.intraday
         *
         * jeweils mit:
         *
         * timestamp
         * price
         */


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


        /*
         * Alle Datenpunkte zusammenführen
         */

        const allTimestamps =
            [
                ...dayAhead.map(x => x.timestamp),
                ...intraday.map(x => x.timestamp)
            ];


        const minTimestamp =
            Math.min(...allTimestamps);


        const maxTimestamp =
            Math.max(...allTimestamps);


        /*
         * Chart
         */

        const timestamps =
            [];

        for (
            let t = minTimestamp;
            t <= maxTimestamp;
            t += 15 * 60
        ) {

            timestamps.push(t);

        }


        /*
         * Day-Ahead Map
         */

        const dayAheadMap =
            new Map(
                dayAhead.map(
                    x => [
                        x.timestamp,
                        x.price
                    ]
                )
            );


        /*
         * Intraday Map
         */

        const intradayMap =
            new Map(
                intraday.map(
                    x => [
                        x.timestamp,
                        x.price
                    ]
                )
            );


        /*
         * Labels
         */

        const labels =
            timestamps.map(
                timestamp => {

                    const d =
                        new Date(
                            timestamp
                        );

                    return d.toLocaleString(
                        "de-DE",
                        {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );

                }
            );


        /*
         * Datenreihen
         */

        const dayAheadValues =
            timestamps.map(
                timestamp =>
                    dayAheadMap.get(
                        timestamp
                    ) ?? null
            );


        const intradayValues =
            timestamps.map(
                timestamp =>
                    intradayMap.get(
                        timestamp
                    ) ?? null
            );


        /*
         * Aktuelle Werte
         */

        const currentIntraday =
            findLatest(
                intraday
            );


        const currentDayAhead =
            findLatest(
                dayAhead
            );


        if (currentIntraday) {

            document
                .getElementById(
                    "currentIntraday"
                )
                .textContent =
                formatPrice(
                    currentIntraday.price
                );


            document
                .getElementById(
                    "currentIntradayTime"
                )
                .textContent =
                formatDateTime(
                    currentIntraday.timestamp
                );

        }


        if (currentDayAhead) {

            document
                .getElementById(
                    "currentDayAhead"
                )
                .textContent =
                formatPrice(
                    currentDayAhead.price
                );


            document
                .getElementById(
                    "currentDayAheadTime"
                )
                .textContent =
                formatDateTime(
                    currentDayAhead.timestamp
                );

        }


        /*
         * Spread
         */

        if (
            currentIntraday &&
            currentDayAhead
        ) {

            const spread =
                currentIntraday.price -
                currentDayAhead.price;


            document
                .getElementById(
                    "currentSpread"
                )
                .textContent =
                formatPrice(
                    spread
                );

        }


        /*
         * Tagesmittel heute
         */

        const today =
            new Date();


        const todayString =
            today.toLocaleDateString(
                "de-DE"
            );


        const todayValues =
            intraday
                .filter(
                    x =>
                        new Date(
                            x.timestamp
                        ).toLocaleDateString(
                            "de-DE"
                        ) === todayString
                )
                .map(
                    x => x.price
                );


        if (
            todayValues.length
        ) {

            const average =
                todayValues.reduce(
                    (a, b) =>
                        a + b,
                    0
                ) /
                todayValues.length;


            document
                .getElementById(
                    "todayAverage"
                )
                .textContent =
                formatPrice(
                    average
                );

        }


        /*
         * Aktualisierungszeit
         */

        if (json.generated_at) {

            document
                .getElementById(
                    "updateTime"
                )
                .textContent =
                new Date(
                    json.generated_at
                ).toLocaleString(
                    "de-DE"
                );

        }


        /*
         * Chart
         */

        const ctx =
            document
                .getElementById(
                    "priceChart"
                )
                .getContext(
                    "2d"
                );


        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Intraday kontinuierlich (15 Min.)",

                            data:
                                intradayValues,

                            borderColor:
                                "#f39c12",

                            backgroundColor:
                                "transparent",

                            borderWidth: 2,

                            pointRadius: 0,

                            pointHoverRadius: 5,

                            stepped: true,

                            spanGaps: false

                        },


                        {

                            label:
                                "Day Ahead Auktion",

                            data:
                                dayAheadValues,

                            borderColor:
                                "#e51c23",

                            backgroundColor:
                                "transparent",

                            borderWidth: 2,

                            pointRadius: 0,

                            pointHoverRadius: 5,

                            stepped: true,

                            spanGaps: false

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,


                    interaction: {

                        mode: "index",

                        intersect: false

                    },


                    plugins: {

                        legend: {

                            display: false

                        },


                        tooltip: {

                            callbacks: {

                                title:
                                    function(items) {

                                        return items[0]
                                            .label;

                                    },


                                label:
                                    function(context) {

                                        return (
                                            context.dataset
                                                .label
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

                                maxTicksLimit: 20,

                                maxRotation: 0,

                                minRotation: 0

                            },


                            grid: {

                                color:
                                    "#e5e7eb"

                            }

                        },


                        y: {

                            title: {

                                display: true,

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


    }

    catch (error) {

        console.error(error);


        document
            .getElementById(
                "updateTime"
            )
            .textContent =
            "Fehler beim Laden";


        document
            .querySelector(
                ".chart-container"
            )
            .innerHTML =
            `
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


/* Hilfsfunktionen */


function findLatest(data) {

    if (!data.length) {

        return null;

    }

    return data
        .slice()
        .sort(
            (a, b) =>
                a.timestamp -
                b.timestamp
        )
        .at(-1);

}


function formatPrice(value) {

    return (
        Number(value)
            .toLocaleString(
                "de-DE",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )
        +
        " €/MWh"
    );

}


function formatDateTime(timestamp) {

    return new Date(
        timestamp
    ).toLocaleString(
        "de-DE",
        {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


loadData();
