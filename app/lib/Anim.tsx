import { produce } from "immer";
import { immerable } from "immer";

// Source - https://stackoverflow.com/a/8809472
// Posted by Briguy37, modified by community. See post 'Timeline' for change history
// Retrieved 2026-05-25, License - CC BY-SA 4.0

export function UUID() { // Public Domain/MIT
    let d = new Date().getTime();//Timestamp
    let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export enum E_Mode { HAND, BRUSH, BUCKET, ERASER };

export class Vector {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }
}

export class Rectangle extends Vector {
    w: number;
    h: number;

    constructor(x: number = 0, y: number = 0, w: number, h: number) {
        super(x, y);

        this.w = w;
        this.h = h;
    }
}

export type AnimObjectProps = { type: string; pos: Vector; center: Vector; scale: Vector; rot: number; opacity: number; };

export abstract class AnimObject {
    type: string;
    pos: Vector;
    center: Vector;
    scale: Vector;
    rot: number;
    opacity: number;
    selected: boolean;

    constructor(data: AnimObjectProps) {
        this.type = "generic";
        this.pos = data.pos || new Vector();
        this.center = data.center || new Vector();
        this.scale = data.scale || new Vector(1, 1);
        this.rot = data.rot || 0;
        this.opacity = data.opacity || 1;
        this.selected = false;
    }

    abstract render(ctx: CanvasRenderingContext2D): void;

    _render(ctx: CanvasRenderingContext2D) {
        ctx.save();

        ctx.translate(this.pos.x, this.pos.y);

        ctx.scale(this.scale.x, this.scale.y);
        ctx.rotate(this.rot);

        ctx.translate(-this.center.x, -this.center.y);

        ctx.globalAlpha = this.opacity;

        this.render(ctx);
        
        // if (this.selected && mode === Mode.HAND && !isExporting) this.renderSelected(ctx);

        ctx.restore();
    }

    renderSelected(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "red";
    }

    static fromJSON(json: any): AnimObject | null {
        switch (json.type) {
            case "stroke":
                return new AnimStroke(json);
            case "image":
                return new AnimImage(json);
        }

        return null;
    }
}

export type BrushProps = {
    id: string;
    size: number;
    color: string;
    lineCap: string;
};

export class Brush {
    id: string;
    size: number;
    color: string;
    lineCap: string;

    constructor(data: BrushProps = {
        id: UUID(),
        size: 5,
        color: "#000000",
        lineCap: "round"
    }) {
        this.id = data.id;
        this.size = data.size;
        this.color = data.color;
        this.lineCap = data.lineCap;
    }
};
export type Point = {x: number, y: number, pressure: number, break?: boolean, deleted?: boolean};

export interface AnimStrokeProps extends AnimObjectProps { brush: Brush; points: Point[] };

export class AnimStroke extends AnimObject {    
    brush: Brush;
    points: Point[];

    constructor(data: AnimStrokeProps) {
        super(data);

        this.type = "stroke";
        this.brush = data.brush;
        this.points = data.points || [];
    }

    render(ctx: CanvasRenderingContext2D) {
        if (this.points.length === 0) return;

        ctx.lineWidth = this.points[0].pressure * this.brush.size;
        ctx.lineCap = this.brush.lineCap as CanvasLineCap;
        ctx.lineJoin = this.brush.lineCap as CanvasLineJoin;
        ctx.strokeStyle = this.brush.color;

        let penDown = false;

        for (let i = 0; i < this.points.length; i++) {
            const pt = this.points[i];

            if (pt.deleted) {
            penDown = false;
            continue;
            }

            ctx.lineWidth = pt.pressure * this.brush.size;

            if (!penDown) {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            penDown = true;
            } else {
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y); // carry forward for next segment's lineWidth change
            }
        }
    }
}

export interface AnimImageProps extends AnimObject { imageAsset: ImageAsset, width: number; height: number; };

export class AnimImage extends AnimObject {
    imageAsset: ImageAsset;
    width: number;
    height: number;

    constructor(data: AnimImageProps) {
        super(data);

        this.type = "image";

        console.log(data.imageAsset);

        this.imageAsset = data.imageAsset;
        
        if (!data.imageAsset.image || !data.imageAsset.image.src) {
            this.imageAsset.image = new Image();
            this.imageAsset.image.src = this.imageAsset.base64;
            
            this.imageAsset.image.onerror = () => {
                this.imageAsset.image.src = "/no_img_placeholder.svg";
            };
        }

        this.width = data.width || this.imageAsset.image.width;
        this.height = data.height || this.imageAsset.image.height;
        this.center.x = this.width / 2;
        this.center.y = this.height / 2;
    }

    renderSelected(ctx: CanvasRenderingContext2D) {
        super.renderSelected(ctx);

        ctx.strokeRect(0, 0, this.width, this.height);
    }

    render(ctx: CanvasRenderingContext2D) {
        ctx.drawImage(this.imageAsset.image, 0, 0, this.width, this.height);
    }
}

export type AssetProps = { type: string; base64: string; }

export class Asset {
    type: string;
    base64: string;

    constructor(data: AssetProps) {
        this.type = data.type;
        this.base64 = data.base64;
    }

    fromJSON(json: any) {
        switch (json.type) {
        case "image":
            return new ImageAsset(json);
            break;
        }
    }
}

export class ImageAsset extends Asset {
    image: HTMLImageElement;

    constructor(data: AssetProps) {
        super(data);

        this.image = new Image();
        this.image.src = this.base64;
    }

    static async fromImageURL(url: string): Promise<ImageAsset> {
        return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = url;
        image.crossOrigin = "anonymous";

        console.log(image);

        image.onload = () => {
            const canvas: HTMLCanvasElement = document.createElement("canvas");
            const res:CanvasRenderingContext2D|null = canvas.getContext("2d");

            if (!res || !(res instanceof CanvasRenderingContext2D)) {
                throw new Error('Failed to get 2D context');
            }

            const ctx: CanvasRenderingContext2D = res;

            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            resolve(new ImageAsset({ type: "image", base64: canvas.toDataURL('image/png') }))
        };

        image.onerror = async (e) => {
            // try {
            //    const response = await fetch(`/api/fetch?url=${url}`);
            // } catch (error) {
            //    console.error(error);
            // }

            reject();
        };
        });
    }
}



export class Camera extends Vector {
    scale: number;
    minScale: number;
    maxScale: number;
    fitScale: number;

    constructor({ x, y, scale, minScale, maxScale }: any = {}) {
        super(x, y);

        this.scale = scale || 0.5;
        this.minScale = minScale || 0.25;
        this.maxScale = maxScale || 5;
        this.fitScale = 1;
    }

    static fromJSON(json: any) {
        return new Camera(json);
    }
}

export class Frame {
    id: string;
    index: number;
    animObjects: AnimObject[];

    constructor(index: number) {
        console.log("New frame created with index #" + index);

        this.id = UUID();
        this.index = index;
        this.animObjects = [];
    }

    static fromJSON(json: any) {
        const frame = new Frame(json.index);

        for (const animObjectJSON of json.animObjects) {
            const animObject = AnimObject.fromJSON(animObjectJSON);

            if (animObject instanceof AnimObject)
                frame.animObjects.push(animObject);
        }

        return frame;
    }
}

export class Layer {
    name: string;
    id: string;
    frames: Frame[];
    locked: boolean;
    visible: boolean;
    opacity: number;

    [immerable] = true;

    constructor(json: any = {}) {
        this.name = json.name || `New Layer`;
        this.id = json.id || UUID();
        this.frames = [];
        this.addFrame(new Frame(0));
        this.locked = json.locked || false;
        this.visible = json.visible || true;
        this.opacity = json.opacity || 1;

        console.log(`New layer "${this.name}" created`);
    }

    static fromJSON(json: any) {
        const layer = new Layer(json);
        
        layer.id = json.id
        layer.frames = []; // clearing out single frame

        for (const frameJSON of json.frames) {
            const frame = Frame.fromJSON(frameJSON);

            layer.addFrame(frame);
        }

        return layer;
    }

    addFrame(frame: Frame) {
        const overlappingFrame = this.frames.find((fr) => fr.index === frame.index);

        if (overlappingFrame) {
            console.warn(`Could not add frame: frame at index ${frame.index} already exists.`);
            console.log("Frame:", frame);
            return;
        }

        this.frames.push(frame);
        this.frames.sort((a: Frame, b: Frame) => a.index - b.index);

        console.log(this.frames);
    }

    getActualFrameIndexOfFrame(frameIndex: number) {
        if (this.frames.length === 0) {
            console.error(`getFrame(${frameIndex}) failed because there are currently no frames...`)
            return -1;
        }

        for (let i = this.frames.length - 1; i >= 0; i--) {
            if (frameIndex >= this.frames[i].index) {
                return i;
            }
        }

        return -1;
    }

    getFrame(frameIndex: number) {
        if (this.frames.length === 0) {
            console.error(`getFrame(${frameIndex}) failed because there are currently no frames...`)
            return null;
        }

        for (let i = this.frames.length - 1; i >= 0; i--) {
            if (frameIndex >= this.frames[i].index) {
                return this.frames[i];
            }
        }

        return null;
    }
}

type AnimEvent = {type: string, frame: Frame, animObject: AnimObject};

export type AnimRef = {
    brush: Brush,
    brushes: Brush[],
    mode: E_Mode,
    metadata: {width: number, height: number, fps: number},
    history: AnimEvent[],
    onion: {enabled: boolean, layers: number},
    camera: Camera,
    isPlaying: boolean,
    isLooping: boolean,
    isExporting: boolean, 
    isPointerDown: boolean,
    currentFrameIndex: number,
    currentLayerIndex: number,
    frameRange: number[],
    mouse: Vector,
    layers: Layer[],
    activeAnimObject: AnimObject|null
};