let cptuData = [];

// FILE UPLOAD & PARSING

document.getElementById("fileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function (results) {
                cptuData = results.data;
                alert("File loaded successfully!");
            },
            error: function () {
                alert("Error loading file.");
            },
        });
    }
});

// CALCULATE Qtn & Fr

function calculateSBT(data) {
    return data.map((row) => {
        // Read the raw CPTu columns
        const qt = row["qt"];           // cone resistance
        const fs = row["fs"];           // sleeve friction
        const u2 = row["u2"];           // pore pressure
        const sigma_vo_eff = row["sigma_vo_eff"]; // effective vertical stress

        // Normalized parameters
        const Qtn = qt / sigma_vo_eff;       // Qtn
        const Fr = (fs / qt) * 100;          // Fr (%)

        // Depth is handy for plotting on a second axis if desired
        const depth = row["depth"];

        return { depth, qt, fs, u2, Qtn, Fr };
    });
}

// Generate a Qtn array for the line "CD = 70" over a range of Fr values. 
function boundaryCD70(frValues) {
    const xVals = [];
    const yVals = [];
    frValues.forEach((Fr) => {
        const denom = Math.pow(1 + 0.06 * Fr, 17);
        const Qtn = 11 + 70 / denom;
        xVals.push(Fr);
        yVals.push(Qtn);
    });
    return { x: xVals, y: yVals };
}

// Solve Qtn for a given IB = constant, across a range of Fr.
function boundaryIB(ibVal, frValues) {
    const xVals = [];
    const yVals = [];
    frValues.forEach((Fr) => {
        // IB = 100*(Qtn+10) / (70 + Qtn*Fr) = ibVal
        // ibVal * (70 + Qtn*Fr) = 100*Qtn + 1000
        // => ibVal*70 + ibVal*Qtn*Fr = 100*Qtn + 1000
        // => Qtn*(ibVal*Fr - 100) = 1000 - 70*ibVal
        const numerator = 1000 - 70 * ibVal;
        const denominator = ibVal * Fr - 100;
        if (denominator !== 0) {
            const Qtn = numerator / denominator;
            // Only plot if Qtn > 0 to avoid weird negative or zero values
            if (Qtn > 0) {
                xVals.push(Fr);
                yVals.push(Qtn);
            }
        }
    });
    return { x: xVals, y: yVals };
}

// PLOT EVERYTHING
 
function plotData() {
    if (cptuData.length === 0) {
        alert("No data to plot. Please load a file first.");
        return;
    }

    // Calculate Qtn, Fr, etc. from the raw data
    const processed = calculateSBT(cptuData);

    // CPTu Data Trace
    const cptTrace = {
        x: processed.map((row) => row.Fr),
        y: processed.map((row) => row.Qtn),
        mode: "markers",
        name: "CPTu Data",
        marker: {
            size: 6,
            color: "blue",
            symbol: "circle",
        },
    };

    // Generate boundary lines over a log-spaced range of Fr
    //     e.g., from 0.1% to 10% in small steps (equivalent to linspace in python)
    const frRange = [];
    for (let val = 0.1; val <= 10; val *= 1.1) {
        frRange.push(val);
    }

    // -- CD = 70 boundary
    const cd70 = boundaryCD70(frRange);
    const cd70Trace = {
        x: cd70.x,
        y: cd70.y,
        mode: "lines",
        name: "CD = 70",
        line: {
            color: "red",
            width: 2,
            dash: "solid",
        },
    };

    // -- IB = 22 boundary
    const ib22 = boundaryIB(22, frRange);
    const ib22Trace = {
        x: ib22.x,
        y: ib22.y,
        mode: "lines",
        name: "IB = 22",
        line: {
            color: "green",
            width: 2,
            dash: "dash",
        },
    };

    // -- IB = 32 boundary
    const ib32 = boundaryIB(32, frRange);
    const ib32Trace = {
        x: ib32.x,
        y: ib32.y,
        mode: "lines",
        name: "IB = 32",
        line: {
            color: "orange",
            width: 2,
            dash: "dot",
        },
    };

    // Plot layout
    const layout = {
        title: "Robertson SBT Chart (Qtn vs. Fr)",
        xaxis: {
            title: "F<sub>r</sub> (%)",
            type: "log",
            autorange: true,
            mirror: true,
            ticks: "outside",
            showline: true,
        },
        yaxis: {
            title: "Q<sub>tn</sub>",
            type: "log",
            autorange: true,
            mirror: true,
            ticks: "outside",
            showline: true,
        },
        legend: {
            x: 0.8,
            y: 1,
        },
    };

    // Concantenate traces and draw
    Plotly.newPlot("chart", [cptTrace, cd70Trace, ib22Trace, ib32Trace], layout);
}
