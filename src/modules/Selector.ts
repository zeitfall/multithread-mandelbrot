export default class Selector {

    protected readonly _listeners: Map<string, (context: Selector) => void>;

    readonly canvas: HTMLCanvasElement;
    protected readonly _context: CanvasRenderingContext2D;

    protected readonly _from: { x: number, y: number };
    protected readonly _to: { x: number, y: number };

    constructor(readonly target: HTMLCanvasElement) {
        this._listeners = new Map();

        this.canvas = document.createElement('canvas');
        this._context = this.canvas.getContext('2d');

        this.canvas.width = target.width;
        this.canvas.height = target.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';

        this.canvas.addEventListener('pointerdown', event => this._onPointerDown(event));
        this.canvas.addEventListener('pointerup', event => this._onPointerUp(event));
        this.canvas.addEventListener('pointermove', event => this._onPointerMove(event), { passive: true });

        this.target.parentElement.style.position = 'relative';
        this.target.parentElement.prepend(this.canvas);

        this._context.lineWidth = 4;
        this._context.strokeStyle = 'red';

        this._from = { x: 0, y: 0 };
        this._to = { x: 0, y: 0 };
    }

    get startX() {
        return Math.min(this._from.x, this._to.x);
    }

    get endX() {
        return Math.max(this._from.x, this._to.x);
    }

    get startY() {
        return Math.min(this._from.y, this._to.y);
    }

    get endY() {
        return Math.max(this._from.y, this._to.y);
    }

    addEventListener(type: string, callback: (context: Selector) => void) {
        this._listeners.set(type, callback);
    }

    protected _clearCanvas() {
        this._context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    protected _onPointerDown(event: PointerEvent) {
        if (event.button !== 0) {
            return;
        }

        this._from.x = event.offsetX;
        this._from.y = event.offsetY;
    }

    protected _onPointerUp(event: PointerEvent) {
        const isEqual = this._from.x === event.offsetX && this._from.y === event.offsetY;

        if (isEqual) {
            return;
        }

        if (this._listeners.has('pointerup')) {
            this._listeners.get('pointerup')(this);
        }

        this._clearCanvas();

        this._from.x = 0;
        this._from.y = 0;
        this._to.x = 0;
        this._to.y = 0;
    }

    protected _onPointerMove(event: PointerEvent) {
        const { pressure, buttons, offsetX, offsetY } = event;

        if (pressure + buttons <= 0) {
            return;
        }

        this._to.x = offsetX;
        this._to.y = offsetY;

        if (this._listeners.has('pointermove')) {
            this._listeners.get('pointermove')(this);
        }

        this._clearCanvas();

        this._context.strokeRect(
            this._from.x,
            this._from.y,
            this._to.x - this._from.x,
            this._to.y - this._from.y
        );
    }
}
