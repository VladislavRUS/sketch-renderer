let canvas;
let ctx;

const CLASSES = {
    PAGE: 'page',
    ARTBOARD: 'artboard',
    GROUP: 'group',
    SHAPE_GROUP: 'shapeGroup',
    SHAPE_PATH: 'shapePath',
    RECTANGLE: 'rectangle',
    OVAL: 'oval',
    TEXT: 'text',
    BITMAP: 'bitmap'
};

const fillPlainList = (data, plainList) => {
    if (data._class !== CLASSES.ARTBOARD) {
        plainList.push(data);
    }

    if (data.layers) {
        data.layers.forEach(child => fillPlainList(child, plainList));
    }
};

const getPathToLayer = (plainList, path) => {
    const lastInsterted = path[path.length - 1];

    const parent = plainList.find(elem => {
        if (!elem.layers) {
            return false;
        } else {
            return !!elem.layers.find(layer => layer.do_objectID === lastInsterted.do_objectID);
        }
    });

    if (parent) {
        path.push(parent);
        getPathToLayer(plainList, path);
    }
};

const createSVG = (points, color, x, y, fillColor, strokeColor, lineWidth, fillRule) => {
    const { red, green, blue, alpha } = color;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', 22);
    svg.setAttribute('height', 22);
    svg.setAttribute('viewBox', '0 0 22 22');
    const newpath = document.createElementNS('http://www.w3.org/2000/svg', "path");
    newpath.setAttributeNS(
        null,
        "d",
        points
    );

    svg.appendChild(newpath);
    if (fillColor) {
        newpath.setAttribute('fill', `${fillColor}`);
    }
    if (strokeColor) {
        newpath.setAttribute('stroke', `${strokeColor}`);
    }

    newpath.setAttribute('fill-rule', fillRule);

    svg.style.position = 'absolute';
    svg.style.left = x;
    svg.style.top = y;
    document.querySelector('.main').appendChild(svg);
}

const processPage = (page) => {
    const pageName = page.name;
    const artboard = page.layers[0];
    const artboardWidth = artboard.frame.width;
    const artboardHeight = artboard.frame.height;

    canvas = document.createElement('canvas');
    canvas.width = artboardWidth;
    canvas.height = artboardHeight;

    paper.setup(canvas);

    document.querySelector('.main').appendChild(canvas);
    const plainList = [];

    const rootLayers = artboard.layers;
    fillPlainList(page, plainList);

    rootLayers.forEach(layer => drawLayer(layer, plainList));
};

const getCoordsFromPoint = (point) => {
    const splitted = point.split(',');
    const x = parseFloat(splitted[0].substring(1));
    const y = parseFloat(splitted[1].substring(1, splitted[1].length - 1));

    return { x, y };
}

const getBorder = (layer) => {
    if (layer.style && layer.style.borders) {
        const border = layer.style.borders[0];

        if (border.isEnabled) {
            const { red, green, blue, alpha } = border.color;
            return {
                strokeColor: `rgba(${red * 255}, ${green * 255}, ${blue * 255}, ${alpha})`,
                lineWidth: border.thickness
            }
        }
    }

    return null;
}

const getFill = (layer) => {
    if (layer.style && layer.style.fills) {
        const fill = layer.style.fills[0];

        if (fill.isEnabled) {
            const { red, green, blue, alpha } = fill.color;
            return {
                color: `rgba(${red * 255}, ${green * 255}, ${blue * 255}, ${alpha})`
            }
        }
    }

    return null;
}

const drawLayer = (layer, plainList) => {
    let shiftX = layer.frame.x;
    let shiftY = layer.frame.y;

    const path = [layer];
    getPathToLayer(plainList, path);
    path.splice(0, 1);

    path.forEach(p => {
        shiftX += p.frame.x;
        shiftY += p.frame.y;
    });

    const _class = layer._class;

    if (!layer.isVisible) {
        return;
    }

    if (_class === CLASSES.SHAPE_GROUP) {
        const border = getBorder(layer);
        const fill = getFill(layer);

        layer.layers.forEach(l => {
            
            const { width, height } = l.frame;
            const pathClass = l._class;
            let path;

            if (pathClass === CLASSES.RECTANGLE) {
                const rect = new paper.Path.Rectangle(shiftX, shiftY, width, height);

                if (fill) {
                    rect.fillColor = fill.color;
                }

                if (border) {
                    rect.strokeColor = border.strokeColor;
                    rect.lineWidth = border.lineWidth;
                }

                path = new paper.Path(rect);

            } else if (pathClass === CLASSES.OVAL) {
                path = new paper.Path();

                const points = l.points;

                points.forEach(point => {
                    const p = getCoordsFromPoint(point.point);

                    [p].forEach(c => {
                        c.x = c.x * width + shiftX;
                        c.y = c.y * height + shiftY;
                    });

                    path.add(new paper.Point(p.x, p.y))
                });

                path.closed = l.isClosed;

                if (pathClass === CLASSES.OVAL) {
                    path.smooth();
                }

                if (fill) {
                    path.fillColor = fill.color;
                }

                if (border) {
                    path.strokeColor = border.strokeColor;
                    path.lineWidth = border.lineWidth;
                }

            } else if (pathClass === CLASSES.SHAPE_PATH) {
                const points = l.points;

                const segments = [];

                const { x, y } = layer.frame;
                const SVGPoints = [];
                const start = points[0];
                const startCoords = getCoordsFromPoint(start.point);

                let fillRule = layer.windingRule === 0 ? 'nonzero' : 'evenodd';

                let pointsPath = `M${startCoords.x * width} ${startCoords.y * height}`;

                points.forEach(point => {
                    const current = getCoordsFromPoint(point.point);
                    const currentFrom = getCoordsFromPoint(point.curveFrom);
                    const currentTo = getCoordsFromPoint(point.curveTo);

                    if (point.hasCurveTo) {
                        SVGPoints.push({
                            x: currentTo.x * width,
                            y: currentTo.y * height,
                        });
                    };

                    SVGPoints.push({
                        x: current.x * width,
                        y: current.y * height,
                    });

                    if (point.hasCurveFrom) {
                        SVGPoints.push({
                            x: currentFrom.x * width,
                            y: currentFrom.y * height,
                        });
                    };

                    const p1 = {
                        x: currentTo.x * width,
                        y: currentTo.y * height
                    };

                    const p2 = {
                        x: currentFrom.x * width,
                        y: currentFrom.y * height
                    };

                    const p3 = {
                        x: current.x * width,
                        y: current.y * height
                    }

                    pointsPath += `C ${(p1.x)} ${(p1.y)}, ${(p2.x)} ${(p2.y)}, ${(p3.x)} ${(p3.y)} `;
                });
                
                let fillColor;
                let strokeColor;
                let lineWidth = 1;

                if (fill) {
                    fillColor = fill.color;
                }

                if (border) {
                    strokeColor = border.strokeColor;
                    lineWidth = border.lineWidth;
                }

                if (layer.isClosed) {
                    pointsPath += 'Z';
                }

                createSVG(pointsPath, { red: 0, green: 1, blue: 1, alpha: 1 }, shiftX, shiftY, fillColor, strokeColor, lineWidth, fillRule);

                // points.forEach((point, idx) => {
                //     const n = idx === points.length - 1 ? points[0] : points[idx + 1];
                //     const current = getCoordsFromPoint(point.point);
                //     const currentFrom = getCoordsFromPoint(point.curveFrom);
                //     const currentTo = getCoordsFromPoint(point.curveTo);
                //     const next = getCoordsFromPoint(n.point);
                //     const nextFrom = getCoordsFromPoint(n.curveFrom);
                //     const nextTo = getCoordsFromPoint(n.curveTo);

                //     [current, currentFrom, currentTo, next, nextFrom, nextTo].forEach(c => {
                //         c.x = c.x * width + shiftX;
                //         c.y = c.y * height + shiftY;
                //     });

                //     const currentPoint = new paper.Point(current.x, current.y);
                //     const currentFromPoint = new paper.Point(currentFrom.x, currentFrom.y);
                //     const currentToPoint = new paper.Point(currentTo.x, currentTo.y);
                //     const nextPoint = new paper.Point(next.x, next.y);
                //     const nextPointFrom = new paper.Point(nextFrom.x, nextFrom.y);
                //     const nextPointTo = new paper.Point(nextTo.x, nextTo.y);

                //     const firstSegment = new paper.Segment({
                //         point: currentPoint,
                //         //handleIn: point.hasCurveFrom && currentFromPoint || null,
                //         //handleOut: point.hasCurveTo && currentToPoint || null
                //     });

                //     const secondSegment = new paper.Segment({
                //         point: nextPoint,
                //         //handleIn: n.hasCurveFrom && nextPointFrom || null,
                //         //handleOut: n.hasCurveTo && nextPointTo || null
                //     });

                //     segments.push(firstSegment, secondSegment);
                //});


                // path = new paper.Path({
                //     segments: [...segments]
                // });

                // path.closed = l.isClosed;

                // if (fill) {
                //     path.fillColor = fill.color;
                // }

                // if (border) {
                //     path.strokeColor = border.strokeColor;
                //     path.lineWidth = border.lineWidth;
                // }
            }

            if (!path) {
                return;
            }

            paper.view.draw();

            // l.path.points.forEach(point => {
            //     const p = point.point;
            //     const splittedPoint = p.split(',');
            //     const x = parseInt(splittedPoint[0].slice(1)) * width + shiftX;
            //     const y = parseInt(splittedPoint[1].substring(1, splittedPoint[1].length - 1)) * height + shiftY;
            //     path.add(new paper.Point(x, y));
            // });

        });
    }  else if (_class === CLASSES.TEXT) {
        const str = layer.attributedString.string;
        let attrs = layer.attributedString.attributes[0];
        const letterSpacing = attrs.kerning;
        
        attrs = attrs.attributes;

        let red, green, blue, alpha;

        const color = attrs.MSAttributedStringColorAttribute;

        if (!color) {
            red = 0;
            green = 0;
            blue = 0;
            alpha = 1;

        } else {
            red = color.red;
            green = color.green;
            blue = color.blue;
            alpha = color.alpha;
        }

        const { name, size } = attrs.MSAttributedStringFontAttribute.attributes;
        const splittedName = name.split('-');
        
        let fontWeight = '400'
        if (splittedName.length > 1) {
            if (splittedName[1] === 'Bold') {
                fontWeight = '700';
            } else if(splittedName[1] === 'Light') {
                fontWeight = '300';
            }
        }

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = shiftX;
        div.style.top = shiftY;
        div.style.fontFamily = splittedName[0];
        div.style.fontSize = size;
        div.style.height = layer.frame.height;
        div.style.display = 'flex';
        div.style.color = `rgba(${red * 255}, ${green * 255}, ${blue * 255}, ${alpha})`;
        div.fontWeight = fontWeight;
        
        if (attrs.MSAttributedStringTextTransformAttribute === 1) {
            div.style.textTransform = 'uppercase';
        }

        if (str.includes('\r')) {
            str.split('\r').forEach(str => {
                const divText = document.createElement('div');
                divText.innerHTML = str;
                div.appendChild(divText);
            });

            div.style.flexDirection = 'column';
            div.style.justifyContent = 'space-between';
        } else {
            div.innerHTML = str;
            div.style.lineHeight = (attrs.paragraphStyle && attrs.paragraphStyle.maximumLineHeight || layer.frame.height) + 'px';
        }

        document.querySelector('.main').appendChild(div);
    } else if (_class === CLASSES.BITMAP) {
        const img = document.createElement('img');
        img.setAttribute('src', '/assets/' + layer.image._ref);
        img.style.width = layer.frame.width;
        img.style.height = layer.frame.height;
        img.style.position = 'absolute';
        img.style.left = shiftX;
        img.style.top = shiftY;

        document.querySelector('.main').appendChild(img);
    }

    if (layer.layers) {
        layer.layers.forEach(child => drawLayer(child, plainList));
    }
};

const drawImage = (ctx, elem, sX, sY, sWidth, sHeight, dX, dY) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = elem.image;

        img.onload = () => {
            ctx.drawImage(img, sX, sY, sWidth, sHeight, dX, dY, sWidth, sHeight);
            resolve();
        };
    });
};

const drawPath = async (path) => {
    for (let idx = 0; idx < path.length; idx++) {
        const elem = path[idx];

        if (idx === 0) {
            continue;
        }

        if (idx === 1) {
            const { width, height } = elem.size;
            canvas = document.createElement('canvas');
            canvas.style.position = 'relative';
            canvas.width = width;
            canvas.height = height;

            ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.rect(0, 0, width, height);
            ctx.fill();

            document.querySelector('.main').appendChild(canvas);

        } else {

            const { width, height } = elem.size;
            const { x, y } = elem.position;
            const style = elem.style;

            if (style && style.fills) {
                ctx.save();

                style.fills.forEach(fill => {
                    if (!fill.isEnabled) {
                        return;
                    }

                    if (style.contextSettings && style.contextSettings.opacty) {
                        canvas.globalAlpha = style.contextSettings.opacity
                    }

                    const { red, green, blue, alpha } = fill.color;
                    ctx.fillStyle = `rgba(${red * 255}, ${green * 255}, ${blue * 255}, ${alpha})`;
                    ctx.fillRect(x, y, width, height);
                });

                ctx.restore();
            }

            if (style && style.borders) {
                ctx.save();

                if (style.contextSettings && style.contextSettings.opacty) {
                    canvas.globalAlpha = style.contextSettings.opacity
                }

                style.borders.forEach(border => {
                    if (!border.isEnabled) {
                        return;
                    }

                    const { red, green, blue, alpha } = border.color;
                    ctx.lineWidth = border.thickness;
                    ctx.strokeStyle = `rgba(${red * 255}, ${green * 255}, ${blue * 255}, ${alpha})`;
                    ctx.strokeRect(x, y, width, height);
                });

                ctx.restore();
            }

            if (elem.image && elem.visible) {
                let sX = 0;
                let sY = 0;
                let dX = elem.position.x;
                let dY = elem.position.y;
                let sWidth = elem.size.width;
                let sHeight = elem.size.height;

                if (elem.position.x < elem.parentPosition.x) {
                    sX = Math.abs(elem.position.x - elem.parentPosition.x);
                }

                if (elem.position.y < elem.parentPosition.y) {
                    sY = Math.abs(elem.position.y - elem.parentPosition.y);
                }

                const elemLeft = elem.position.x;
                const parentLeft = elem.parentPosition.x;
                const elemRight = elem.position.x + elem.size.width;
                const parentRight = elem.parentPosition.x + elem.parentSize.width;

                if (elemLeft < parentLeft) {
                    sX = Math.abs(elemLeft - parentLeft);
                    dX += sX;
                }

                if (elemRight > parentRight) {
                    sWidth = parentRight - elemLeft - sX;
                }

                const elemTop = elem.position.y;
                const parentTop = elem.parentPosition.y;
                const elemBottom = elem.position.y + elem.size.height;
                const parentBottom = elem.parentPosition.y + elem.parentSize.height;

                if (elemTop < parentTop) {
                    sY = Math.abs(elemTop - parentTop);
                    dY += sY;
                }

                if (elemBottom > parentBottom) {
                    sHeight = parentBottom - sY;
                }

                await drawImage(ctx, elem, sX, sY, sWidth, sHeight, dX, dY);
            }

            if (elem.string) {
                const { red, green, blue, alpha } = elem.color;
                const div = document.createElement('div');
                const splittedText = elem.string.split('\r');
                if (splittedText.length > 0) {
                    splittedText.forEach(text => {
                        const textDiv = document.createElement('div');
                        textDiv.innerHTML = text;
                        div.appendChild(textDiv);
                    });

                    div.style.display = 'flex';
                    div.style.flexDirection = 'column';
                    div.style.justifyContent = 'space-between';
                } else {
                    div.innerHTML = splittedText[0];
                }
                div.style.fontSize = `${elem.fontSize}px`;
                const fontFamilySplitted = elem.fontFamily.split('-');
                div.style.fontFamily = `${fontFamilySplitted[0]}, sans-serif`;
                
                div.style.color = `rgba(${255 * red}, ${255 * green}, ${255 * blue}, ${alpha})`;
                
                div.style.position = 'absolute';
                div.style.left = x;
                div.style.top = y;
                div.style.width = width;
                div.style.height = height;
                div.style.letterSpacing = elem.letterSpacing;
                div.style.whiteSpace = 'nowrap';
                if (fontFamilySplitted[1] === 'Bold') {
                    div.style.fontWeight = '700';
                }

                if (fontFamilySplitted[1] === 'Regular') {
                    div.style.fontWeight = '400';
                }

                if (fontFamilySplitted[1] === 'Light') {
                    div.style.fontWeight = '300';
                }


                if (elem.data.style.textStyle.encodedAttributes.MSAttributedStringTextTransformAttribute === 1) {
                    div.style.textTransform = 'uppercase';
                }

                document.body.appendChild(div);
            }

            const shapePath = elem.data.layers && elem.data.layers.find(layer => layer._class === 'shapePath');

            if (elem.data.layers && shapePath) {
                continue;
            }

            if (elem.data.points) {

                const points = [];
                elem.data.points.forEach(point => {
                    const splitted = point.point.split(',');;
                    const x = splitted[0].substring(1);
                    const y = splitted[1].substring(1, splitted[1].length - 1);
                    points.push({
                        x: x * width,
                        y: y * height
                    });
                });

                const color = elem.parent.style.fills[0].color;
                const { red, green, blue, alpha } = color;

                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute('width', 22);
                svg.setAttribute('height', 22);
                svg.setAttribute('viewBox', '0 0 22 22');
                const newpath = document.createElementNS('http://www.w3.org/2000/svg', "polyline");
                newpath.setAttributeNS(
                    null,
                    "points",
                    points.map(point => `${point.x} ${point.y}`).join(' '));

                svg.appendChild(newpath);
                newpath.setAttribute('fill', `rgba(${255 * red}, ${255 * green}, ${blue * 255}, ${alpha})`);
                svg.style.position = 'absolute';
                svg.style.left = x;
                svg.style.top = y;
                document.body.appendChild(svg);
            }
        }
    }
};

var oReq = new XMLHttpRequest();
oReq.open("GET", "/E1C62095-BB32-466A-AD2C-5006882BE5C0.json");
oReq.send();
oReq.onload = (resp) => {
    const page = JSON.parse(resp.target.response);
    processPage(page);
}