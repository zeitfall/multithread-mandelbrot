import { Pane as GUI } from 'tweakpane';

import { ThreadPool, Selector } from './modules';

const params = {
    workgroupSizeX: 64,
    workgroupSizeY: 64,
    maxIterations: 1024,
    renderTime: '0ms',
};

const gui = new GUI({ title: 'Parameters' });

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d', { alpha: false });

canvas.width = innerWidth;
canvas.height = innerHeight;

const canvasInverseWidth = 1 / canvas.width;
const canvasInverseHeight = 1 / canvas.height;
const canvasAspectRatio = canvas.width / canvas.height;

const selector = new Selector(canvas);

const threadURL = new URL('./thread.ts', import.meta.url);
const threadpool = new ThreadPool<ChunkInput, ChunkOutput>(threadURL);

let bounds = calculateBounds(-2.25, .75, -1, 1);

gui.addBinding(params, 'workgroupSizeX', { min: 16, max: 128, step: 2 });
gui.addBinding(params, 'workgroupSizeY', { min: 16, max: 128, step: 2 });
gui.addBinding(params, 'maxIterations', { min: 16, max: 16384, step: 16 });
gui.addBinding(params, 'renderTime', { readonly: true, multiline: true, rows: 1 });

gui.on('change', async (event) => {
    if (event.target.key === 'maxIterations' && event.last) {
        await render(bounds);
    }
});

render(bounds);

selector.addEventListener('pointerup', async (context) => {
    const {
        startX,
        startY,
        endX,
        endY,
    } = context;

    const {
        minRe,
        maxRe,
        minIm,
        maxIm,
        lengthRe,
        lengthIm,
    } = bounds;

    const newMinRe = minRe + lengthRe * startX * canvasInverseWidth;
    const newMaxRe = maxRe - lengthRe * (canvas.width - endX) * canvasInverseWidth;
    const newMinIm = minIm + lengthIm * startY * canvasInverseHeight;
    const newMaxIm = maxIm - lengthIm * (canvas.height - endY) * canvasInverseHeight;

    bounds = calculateBounds(newMinRe, newMaxRe, newMinIm, newMaxIm);

    await render(bounds);
});

function calculateBounds(minRe: number, maxRe: number, minIm: number, maxIm: number) {
    const centerRe = (minRe + maxRe) / 2;
    const centerIm = (minIm + maxIm) / 2;

    let lengthRe = maxRe - minRe;
    let lengthIm = maxIm - minIm;

    if (lengthRe / lengthIm < canvasAspectRatio) {
        lengthRe = lengthIm * canvasAspectRatio;
    }
    else {
        lengthIm = lengthRe / canvasAspectRatio;
    }

    const halfLengthRe = lengthRe / 2;
    const halfLengthIm = lengthIm / 2;

    return {
        minRe: centerRe - halfLengthRe,
        maxRe: centerRe + halfLengthRe,
        minIm: centerIm - halfLengthIm,
        maxIm: centerIm + halfLengthIm,
        centerRe,
        centerIm,
        lengthRe,
        lengthIm,
    };
}

async function render(bounds: ReturnType<typeof calculateBounds>) {
    const chunks: ThreadPayload<ChunkInput>[] = [];

    const { workgroupSizeX, workgroupSizeY, maxIterations } = params;

    const workgroupsX = Math.ceil(canvas.width / workgroupSizeX);
    const workgroupsY = Math.ceil(canvas.height / workgroupSizeY);

    for (let j = 0; j < workgroupsY; j++) {

        for (let i = 0; i < workgroupsX; i++) {
            const chunkStartX = i * workgroupSizeX;
            const chunkStartY = j * workgroupSizeY;
            const chunkSizeX = Math.min(workgroupSizeX, canvas.width - chunkStartX);
            const chunkSizeY = Math.min(workgroupSizeY, canvas.height - chunkStartY);

            chunks.push({
                data: {
                    canvasInverseWidth,
                    canvasInverseHeight,
                    chunkStartX,
                    chunkStartY,
                    chunkSizeX,
                    chunkSizeY,
                    maxIterations,
                    ...bounds,
                },
            });
        }
    }

    const startTime = performance.now();

    await threadpool.submit(chunks, (event) => {
        const {
            chunkData,
            chunkStartX,
            chunkStartY,
        } = event.data;

        context.putImageData(chunkData, chunkStartX, chunkStartY);
    });

    const finishTime = performance.now();
    const renderTime = finishTime - startTime;

    params.renderTime = `${renderTime.toFixed(2)}ms`;
}
