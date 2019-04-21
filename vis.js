const attr = {
    file: "./data/fire_department_calls_for_service_stratified.json",
    plot: {
        width: 960,
        height: 500
    },
    pad: 14,
    r: 5
};

const translate = function(a, b) {
    return "translate(" + a + ", " + b + ")";
};

const drawLinks = function(g, links, generator) {
    let paths = g
        .selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("d", generator)
        .attr("class", "link");
};

const drawNodes = function(g, nodes, raise, color) {
    let circles = g
        .selectAll("circle")
        .data(nodes, node => node.data.name)
        .enter()
        .append("circle")
        .attr("r", d => (d.r ? d.r : attr.r))
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("id", d => d.data.name)
        .attr("class", "node")
        .style("fill", d => color(d.depth));

    setupEvents(g, circles, raise);
};

const setupEvents = function(g, selection, raise) {
    selection.on("mouseover.highlight", function(d) {
        let path = d3
            .select(this)
            .datum()
            .path(selection.data()[0]);
        let update = selection.data(path, node => node.data.name);
        update.classed("active", true);

        if (raise) {
            update.raise();
        }
    });

    selection.on("mouseout.highlight", function(d) {
        let path = d3
            .select(this)
            .datum()
            .path(selection.data()[0]);
        let update = selection.data(path, node => node.data.name);
        update.classed("active", false);
    });

    selection.on("mouseover.tooltip", function(d) {
        showTooltip(g, d3.select(this));
    });

    selection.on("mouseout.tooltip", function(d) {
        g.select("#tooltip").remove();
    });
};

const showTooltip = function(g, node) {
    let gbox = g.node().getBBox();
    let nbox = node.node().getBBox();

    let dx = nbox.width / 2;
    let dy = nbox.height / 2;

    let x = nbox.x + dx;
    let y = nbox.y + dy;

    let datum = node.datum();
    let text = datum.data.name + " (" + datum.value + ")";

    let tooltip = g
        .append("text")
        .text(text)
        .attr("x", x)
        .attr("y", y)
        .attr("dy", -dy - 4)
        .attr("text-anchor", "middle")
        .attr("id", "tooltip");

    let tbox = tooltip.node().getBBox();

    if (tbox.x < gbox.x) {
        tooltip.attr("text-anchor", "start");
        tooltip.attr("dx", -dx);
    } else if (tbox.x + tbox.width > gbox.x + gbox.width) {
        tooltip.attr("text-anchor", "end");
        tooltip.attr("dx", dx);
    }

    if (tbox.y < gbox.y) {
        tooltip.attr("dy", dy + tbox.height);
    }
};

const processData = function(data) {
    root = d3
        .stratify()
        .id(row => row.name)
        .parentId(row => row.parent)(data);

    root.count();

    root.each(function(node) {
        node.data.leaves = node.value;
    });

    root.sum(row => row.size);

    root.each(function(node) {
        node.data.total = node.value;
    });

    return root;
};

const nodelink = function(data, color) {
    let layout = d3
        .tree()
        .size([
            attr.plot.width - 2 * attr.pad,
            attr.plot.height - 2 * attr.pad
        ]);

    data.sort(function(a, b) {
        return b.height - a.height || b.value - a.value;
    });

    layout(data);

    let svg = d3.select("#svg1");
    let plot = svg
        .append("g")
        .attr("id", "plot1")
        .attr("transform", translate(attr.pad, attr.pad));

    let curvedLine = d3
        .linkVertical()
        .x(d => d.x)
        .y(d => d.y);

    drawLinks(plot.append("g"), data.links(), curvedLine);
    drawNodes(plot.append("g"), data.descendants(), true, color);
};

d3.json(attr.file).then(function(d) {
    let processed = processData(d);
    let color = d3.scaleSequential([processed.height, 0], d3.interpolateWarm);

    nodelink(processed, color);
});
