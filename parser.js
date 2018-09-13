const fs = require('fs');

const file = './sketch/file/pages/28E6E355-F2E2-4A98-B30E-209BEF1E767F.json';

const data = JSON.parse(fs.readFileSync(file));

const classes = {
    group: 'group',
    artboard: 'artboard',
    shapeGroup: 'shapeGroup',
    rectangle: 'rectangle',
    text: 'text',
    bitmap: 'bitmap'
}

const fillPlainList = (data, plainList, zIndex) => {
    data.zIndex = zIndex++;
    plainList.push(data);

    if (data.layers) {
        data.layers.forEach(child => fillPlainList(child, plainList, zIndex));
    } else {
        zIndex--;
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



const walkThrough = (data, path, plainList) => {
    const id = data.do_objectID;
    const name = data.name;
    const className = data._class;
    const visible = data.isVisible;

    let shiftX = 0;
    let shiftY = 0;

    let minWidth;

    let pathToLayer = [ data ];

    if (className !== classes.artboard) {
        getPathToLayer(plainList, pathToLayer);

        pathToLayer = pathToLayer.filter(layer => layer._class !== classes.artboard);
        pathToLayer.splice(0, 1);

        if (pathToLayer.length) {
            minWidth = pathToLayer.sort((a, b) => a.frame.width - b.frame.width)[0].frame.width;
        }

        pathToLayer.forEach(elem => {
            shiftX += elem.frame.x > 0 ? elem.frame.x : 0;
            shiftY += elem.frame.y > 0 ? elem.frame.y : 0;
        });
    }

    const position = {
        x: Math.max(parseInt(shiftX + data.frame.x), 0),
        y: Math.max(parseInt(shiftY + data.frame.y), 0)
    }

    const size = {
        width: data.frame.width,
        height: data.frame.height
    }

    const style = data.style;
    
    const pathItem = {
        id,
        name,
        className,
        visible,
        position,
        size,
        style,
        hasChildren: !!data.layers
    };

    const parent = plainList.find(elem => {
        return elem.layers && elem.layers.find(layer => layer.do_objectID === data.do_objectID);
    });

    const pathParent = path.find(p => p.id === parent.do_objectID);

    if (className === classes.bitmap) {
        if (data.clippingMask) {
            
            

            pathItem.parentSize = {
                width: pathParent.size.width,
                height: pathParent.size.width
            };

            pathItem.parentPosition = {
                x: pathParent.position.x,
                y: pathParent.position.y
            }

            console.log(pathItem.position);
            console.log(pathItem.parentPosition);
        }

        pathItem.image = '/assets/' + data.image._ref + '.png';
    }

    if (className === classes.text) {
        const attrs = data.attributedString.attributes[0].attributes;
        pathItem.string = data.attributedString.string;
        pathItem.color = attrs.MSAttributedStringColorAttribute;
        pathItem.fontSize = attrs.MSAttributedStringFontAttribute.attributes.size;
        pathItem.fontFamily = attrs.MSAttributedStringFontAttribute.attributes.name;
        pathItem.letterSpacing = attrs.kerning;
        pathItem.lineHeight = data.lineSpacingBehaviour;
    }

    pathItem.parent = parent;
    pathItem.data = data;

    path.push(pathItem);

    if (data.layers) {
        data.layers.forEach(layer => walkThrough(layer, path, plainList));
    }
};

const plainList = [];
fillPlainList(data, plainList, 0);

const path = [];
walkThrough(data, path, plainList);
fs.writeFileSync('path.json', JSON.stringify(path));

