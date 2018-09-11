const ns = require('node-sketch');

const file = './sketch/file.sketch';
ns.read(file).then(sketch => {
    sketch.pages.forEach(page => {
        const layers = page.layers;
        layers.forEach(layer => {
            layer.layers.forEach(l => {
                console.log(l.frame);
            });
        })
    });
});