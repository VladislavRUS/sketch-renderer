const ns = require('node-sketch');

const file = './sketch/file.sketch';
ns.read(file).then(sketch => {
    sketch.pages.forEach(page => {
        const layers = page.layers;
        layers.forEach(layer => {
            layer.layers.forEach(l => {
                if (l.layers) {
                    l.layers.forEach(l2 => {
                        if (l2._class === 'text') {
                            console.log(Buffer.from(l2.attributedString.archivedAttributedString._archive, 'base64').toString('utf8'));
                        }
                    })
                }
            });
        })
    });
});