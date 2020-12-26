let gaps = [{x: -1, y: -1}];
let opposed = [];
let dominoPositions = [];
let size = 1;
let nextKey = 0;

let busy = false;

let grid = [
    {x: -1, y: -1},
    {x: 0, y: -1},
    {x: -1, y: 0},
    {x: 0, y: 0},
];

const svg = d3.select("svg");

async function updateGrid() {
    let scale = Math.min(1, 20 / size);
    svg.selectAll("g")
        .attr("transform", `scale(${scale})`)

    return svg
        .select("g.grid")
        .selectAll("rect")
        .data(grid)

        .enter().append("rect")
        .attr("x", ({x}) => x * 10 + 5)
        .attr("y", ({y}) => y * 10 + 5)
        .style("fill", "white")
        .style("stroke-width", 1)
        .style("stroke", "rgb(0,0,0)")

        .transition()
        .attr("width", 10)
        .attr("height", 10)
        .attr("x", ({x}) => x * 10)
        .attr("y", ({y}) => y * 10)
        .end();
}

updateGrid();

async function step() {
    if (busy) return;

    try {
        busy = true;
        if (gaps.length) {
            await fillGap(gaps.shift());
            findOpposed();
        } else if (opposed.length) await removeOpposed(opposed.shift());
        else await expandGrid();
    } finally {
        busy = false;
    }
}


function key({key}) {
    return key;
}

async function fillGap({x, y}, duration = 250) {
    if (Math.random() < 0.5) {
        dominoPositions.push({
            x, y,
            facing: "l",
            key: nextKey++
        }, {
            x: x + 1, y,
            facing: "r",
            key: nextKey++
        });
    } else {
        dominoPositions.push({
            x, y,
            facing: "u",
            key: nextKey++
        }, {
            x, y: y + 1,
            facing: "d",
            key: nextKey++
        });
    }

    let dominoes = svg
        .select("g.dominoes")
        .selectAll("rect")
        .data(dominoPositions, key);

    return dominoes
        .enter().append("rect")
        .attr("x", ({x}) => x * 10 + 5)
        .attr("y", ({y}) => y * 10 + 5)
        .attr("fill", ({facing}) => {
            switch (facing) {
                case 'u':
                    return "blue";
                case 'd':
                    return "orange";
                case 'l':
                    return "green";
                case 'r':
                    return "red";
            }
        })
        .transition()
        .duration(duration)
        .attr("x", ({x}) => x * 10)
        .attr("y", ({y}) => y * 10)
        .attr("width", ({facing}) => {
            switch (facing) {
                case 'u':
                case 'd':
                    return 20;
                default:
                    return 10;
            }
        })
        .attr("height", ({facing}) => {
            switch (facing) {
                case 'u':
                case 'd':
                    return 10;
                default:
                    return 20;
            }
        })
        .end();
}

async function removeOpposed({x1, y1, x2, y2}, duration = 250) {
    dominoPositions = dominoPositions.filter(({x, y}) => {
        return !(x === x1 && y === y1 || x === x2 && y === y2);
    });

    let dominoes = svg
        .select("g.dominoes")
        .selectAll("rect")
        .data(dominoPositions, key);

    return dominoes
        .exit().transition()
        .duration(duration)
        .attr("x", ({x}) => x * 10 + 5)
        .attr("y", ({y}) => y * 10 + 5)
        .attr("width", 0)
        .attr("height", 0)
        .remove()
        .end();
}

async function expandGrid() {
    size++;
    for (let x = 0, y = size - 1; x < size; x++, y--) {
        grid.push({x, y});
        grid.push({x: -1 - x, y});
        grid.push({x, y: -1 - y});
        grid.push({x: -1 - x, y: -1 - y});
    }

    await updateGrid();
    await moveDominos();

    findGaps();
}

async function fillGaps() {
    if (busy) return;

    try {
        busy = true;

        while (gaps.length) await fillGap(gaps.shift(), 100);
        findOpposed();
    } finally {
        busy = false;
    }
}

async function clearOpposing() {
    if (busy) return;

    try {
        busy = true;

        while (gaps.length) await fillGap(gaps.shift(), 100);
        findOpposed();
        while (opposed.length) await removeOpposed(opposed.shift(), 100);
    } finally {
        busy = false;
    }
}

async function expand() {
    if (busy) return;

    try {
        busy = true;

        while (gaps.length) await fillGap(gaps.shift(), 25);
        findOpposed();
        while (opposed.length) await removeOpposed(opposed.shift(), 25);

        await expandGrid();
    } finally {
        busy = false;
    }
}

async function moveDominos() {
    dominoPositions.forEach(d => {
        switch (d.facing) {
            case "u":
                d.y--;
                break;
            case "d":
                d.y++;
                break;
            case "l":
                d.x--;
                break;
            case "r":
                d.x++;
                break;
        }
    })

    let dominoes = svg
        .select("g.dominoes")
        .selectAll("rect")
        .data(dominoPositions, key);

    return dominoes
        .transition()
        .attr("x", ({x}) => x * 10)
        .attr("y", ({y}) => y * 10)
        .end();
}

function findOpposed() {
    let seen = {};
    opposed = [];

    dominoPositions.forEach(({x, y, facing}) => {
        let x2 = x, y2 = y, facing2;
        switch (facing) {
            case "u":
                y2--
                facing2 = "d";
                break;
            case "d":
                y2++;
                facing2 = "u";
                break;
            case "l":
                x2--;
                facing2 = "r";
                break;
            case "r":
                x2++;
                facing2 = "l";
                break;
        }
        if (seen[`${x2}:${y2}:${facing2}`]) {
            opposed.push({x1: x, y1: y, x2, y2});
        } else {
            seen[`${x}:${y}:${facing}`] = true;
        }
    })
}

function findGaps() {
    let covered = {};
    dominoPositions.forEach(({x, y, facing}) => {
        covered[`${x}:${y}`] = true;
        switch (facing) {
            case "u":
            case "d":
                covered[`${x + 1}:${y}`] = true;
                break;
            case "l":
            case "r":
                covered[`${x}:${y + 1}`] = true;
                break;
        }
    });

    for (let y = -size; y < size; y++) {
        for (let x = -size; x < size; x++) {
            if (Math.floor(Math.abs(x + 0.5)) + Math.floor(Math.abs(y + 0.5)) >= size) {
                continue;
            }

            if (covered[`${x}:${y}`]) {
                continue;
            }

            gaps.push({x, y});

            covered[`${x}:${y + 1}`] = true;
            x++;
            covered[`${x}:${y + 1}`] = true;
        }
    }
}