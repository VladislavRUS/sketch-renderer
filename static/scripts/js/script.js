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

const processPage = (page) => {
    const pageName = page.name;
    const artboard = page.layers[0];
    const artboardWidth = artboard.frame.width;
    const artboardHeight = artboard.frame.height;

    canvas = document.createElement('canvas');
    canvas.width = artboardWidth;
    canvas.height = artboardHeight;

    paper.setup(canvas);

    document.body.appendChild(canvas);
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

    const path = [ layer ];
    getPathToLayer(plainList, path);
    path.splice(0, 1);

    path.forEach(p => {
        shiftX += p.frame.x;
        shiftY += p.frame.y;
    });

    const _class = layer._class;
        
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

            } else if (pathClass === CLASSES.OVAL || pathClass === CLASSES.SHAPE_PATH) {
                path = new paper.Path();
                
                l.path.points.forEach(point => {
                    const p = getCoordsFromPoint(point.point);

                    [p].forEach(c => {
                        c.x = c.x * width + shiftX;
                        c.y = c.y * height + shiftY;
                    });
                    
                    path.add(new paper.Point(p.x, p.y))
                });

                path.closed = l.path.isClosed;

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
    }

    path.push(layer);
    
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
                const {red, green, blue, alpha } = elem.color;
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
                const newpath = document.createElementNS('http://www.w3.org/2000/svg',"polyline"); 
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
oReq.open("GET", "/28E6E355-F2E2-4A98-B30E-209BEF1E767F.json");
oReq.send();
oReq.onload = (resp) => {
    const page = JSON.parse(resp.target.response);
    processPage(page);
}