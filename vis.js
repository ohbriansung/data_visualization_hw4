const attr = {
    file: "./data/fire_department_calls_for_service_stratified.json",
    plot: {
        width: 960,
        height: 500
    },
    pad: 14,
    r: 4,
    diameter: 500
};

const linkTypes = {
    curvedLine: d3
        .linkVertical()
        .x(d => d.x)
        .y(d => d.y),
    radialLine: d3
        .linkRadial()
        .angle(d => d.theta + Math.PI / 2)
        .radius(d => d.radial)
};

const translate = function(a, b) {
    return "translate(" + a + ", " + b + ")";
};

const drawLinks = function(g, links, generator) {
    let paths = g
        .selectAll("path")
        .data(links, link => link.target.data.name)
        .enter()
        .append("path")
        .attr("d", generator)
        .attr("class", "link");

    return paths;
};

const drawNodes = function(g, nodes, color) {
    let circles = g
        .selectAll("circle")
        .data(nodes, node => node.data.name)
        .enter()
        .append("circle")
        .attr("r", d => (d.r ? d.r : attr.r))
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("class", "node")
        .style("fill", d => color(d.depth));

    return circles;
};

const setupEvents = function(plot, nodes, paths, raise) {
    nodes.on("mouseover.highlight", function(d) {
        let path = d3
            .select(this)
            .datum()
            .path(nodes.data()[0]);
        let updateNodes = nodes.data(path, node => node.data.name);
        updateNodes.classed("active", true);

        if (raise) {
            updateNodes.raise();
        }

        // highlighting paths with path's target name
        if (paths) {
            let updatePaths = plot.selectAll("path.link").filter(function(d) {
                let check = false;
                path.forEach(function(p) {
                    if (p.data.name === d.target.data.name) {
                        check = true;
                    }
                });
                return check;
            });

            updatePaths.classed("active", true);
        }
    });

    nodes.on("mouseout.highlight", function(d) {
        let path = d3
            .select(this)
            .datum()
            .path(nodes.data()[0]);
        let updateNodes = nodes.data(path, node => node.data.name);
        updateNodes.classed("active", false);

        if (paths) {
            let updatePaths = plot.selectAll("path.link").filter(function(d) {
                let check = false;
                path.forEach(function(p) {
                    if (p.data.name === d.target.data.name) {
                        check = true;
                    }
                });
                return check;
            });

            updatePaths.classed("active", false);
        }
    });

    nodes.on("mouseover.tooltip", function(d) {
        showTooltip(plot, d3.select(this));
    });

    nodes.on("mouseout.tooltip", function(d) {
        plot.select("#tooltip").remove();
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

const sorting = function(a, b) {
    return a.height - b.height || a.value - b.value;
};

const toCartesian = function(r, theta) {
    return {
        x: r * Math.cos(theta),
        y: r * Math.sin(theta)
    };
};

const titleAndLegend = function(svg, title, data, color) {
    let range = [...Array(data.height + 1).keys()];

    svg.append("text")
        .attr("transform", translate(attr.pad, 2.5 * attr.pad))
        .attr("class", "title")
        .text(title);

    let legend = svg
        .append("g")
        .attr(
            "transform",
            translate(attr.plot.width - (data.height + 1) * 50 - 10, attr.pad)
        );

    legend
        .append("text")
        .attr("x", -50)
        .attr("y", 15)
        .attr("class", "subtitle")
        .text("Depth");

    legend
        .selectAll("rect")
        .data(range)
        .enter()
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("class", "legendRect")
        .attr("x", d => d * 50)
        .style("fill", d => color(d))
        .style("stroke", "#ffffff");

    legend
        .selectAll(".attribute")
        .data(range)
        .enter()
        .append("text")
        .attr("x", d => d * 50 + 20)
        .attr("y", 12)
        .attr("class", "attribute")
        .text(d => d);
};

const drawNodeLink = function(data, color) {
    let layout = d3
        .tree()
        .size([
            attr.plot.width - 2 * attr.pad,
            attr.plot.height - 4 * attr.pad
        ]);

    layout(data);

    let svg = d3.select("#svg1");
    let plot = svg
        .append("g")
        .attr("id", "plot1")
        .attr("transform", translate(attr.pad, 3 * attr.pad));

    let raise = true;
    let paths = drawLinks(plot.append("g"), data.links(), linkTypes.curvedLine);
    let circles = drawNodes(plot.append("g"), data.descendants(), color);

    setupEvents(plot, circles, paths, raise);

    let title = "Dendrogram";
    titleAndLegend(svg, title, data, color);
};

const drawDenTree = function(data, color) {
    let layout = d3.cluster().size([2 * Math.PI, attr.diameter / 2 - attr.pad]);

    layout(data);

    data.each(function(node) {
        node.theta = node.x;
        node.radial = node.y;

        var point = toCartesian(node.radial, node.theta);
        node.x = point.x;
        node.y = point.y;
    });

    let svg = d3.select("#svg2");

    let plot = svg
        .append("g")
        .attr("id", "plo2")
        .attr(
            "transform",
            translate(attr.plot.width / 2, attr.plot.height / 2)
        );

    let raise = true;
    let paths = drawLinks(plot.append("g"), data.links(), linkTypes.radialLine);
    let circles = drawNodes(plot.append("g"), data.descendants(), color);

    setupEvents(plot, circles, paths, raise);

    let title = "Circular Tree";
    titleAndLegend(svg, title, data, color);
};

const drawTreeMap = function(data, color) {
    let layout = d3
        .treemap()
        .padding(attr.r)
        .size([
            attr.plot.width - 2 * attr.pad,
            attr.plot.height - 5 * attr.pad
        ]);

    layout(data);

    let svg = d3.select("#svg3");

    let plot = svg
        .append("g")
        .attr("id", "plot3")
        .attr("transform", translate(attr.pad, 4 * attr.pad));

    let rects = plot
        .selectAll("rect")
        .data(data.descendants())
        .enter()
        .append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("class", "node")
        .style("fill", d => color(d.depth));

    let raise = false;

    setupEvents(plot, rects, null, raise);

    let title = "Treemap";
    titleAndLegend(svg, title, data, color);
};

const drawSunburst = function(data, color) {
    let r = Math.min(attr.plot.width, attr.plot.height) / 2;

    let layout = d3.partition().size([2 * Math.PI, r - attr.pad]);

    layout(data);

    let svg = d3.select("#svg4");

    let plot = svg
        .append("g")
        .attr("id", "plot4")
        .attr(
            "transform",
            translate(attr.plot.width / 2, attr.plot.height / 2)
        );

    let arc = d3
        .arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

    let arcs = plot
        .selectAll("path")
        .data(data.descendants())
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("class", "node")
        .style("fill", d => color(d.depth));

    let raise = true;
    setupEvents(plot, arcs, null, raise);

    let title = "Sunburst";
    titleAndLegend(svg, title, data, color);
};

const getModules = function(data) {
    let modules = data.children.map(function(d) {
        let name = d.data.name.substring(d.data.name.indexOf("->") + 2);
        return name.length == 0 ? "Empty" : name;
    });

    modules.unshift(data.data.name);

    return modules;
};

const createDropDown = function(modules, data, color) {
    let drop = d3.select("#drop");

    drop.append("select")
        .selectAll("option")
        .data(modules)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    drop.on("change", function() {
        let value = d3
            .select(this)
            .select("select")
            .property("value");

        removeAll();

        if (value === data.data.name) {
            visualize(data.copy(), color);
        } else {
            for (let i = 0; i < data.children.length; i++) {
                let name = data.children[i].data.name.substring(
                    data.children[i].data.name.indexOf("->") + 2
                );
                name = name.length == 0 ? "Empty" : name;

                if (name === value) {
                    visualize(data.children[i].copy(), color);
                }
            }
        }
    });
};

const visualize = function(data, color) {
    drawNodeLink(data, color);
    drawDenTree(data, color);
    drawTreeMap(data, color);
    drawSunburst(data, color);
};

const removeAll = function() {
    d3.selectAll("svg")
        .selectAll("*")
        .remove();
};

d3.json(attr.file).then(function(d) {
    let processed = processData(d);
    let color = d3.scaleSequential([processed.height, 0], d3.interpolateWarm);
    let sorted = processed.sort(sorting);

    let modules = getModules(sorted);
    createDropDown(modules, sorted, color);

    visualize(sorted, color);
});
