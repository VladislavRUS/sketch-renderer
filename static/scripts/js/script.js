let canvas;
let ctx;

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

const drawPath = async () => {
    for (let idx = 0; idx < path.length; idx++) {
        const elem = path[idx];

        if (idx === 0) {
            continue;
        }

        if (idx === 1) {
            const { width, height } = elem.size;
            canvas = document.createElement('canvas');
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
                    ctx.strokeWidth = style.thickness;
                    ctx.strokeStyle = `rgba(${red * 255}, ${green * 255}, ${blue * 255}, ${alpha})`;
                    ctx.strokeRect(x - 0.5, y - 0.5, width, height);
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
                ctx.font = `${elem.fontSize}px ${elem.fontFamily}`;
                const {red, green, blue, alpha } = elem.color;
                ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
                ctx.fillText(elem.string, x, y);
            }
        }
    }
};

drawPath();