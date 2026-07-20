'use client';

import { IconBrush, IconBucket, IconEraser, IconHandStop, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward } from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";
import MenuBar from "./components/MenuBar";

enum E_Mode {
    HAND = "HAND",
    BRUSH = "BRUSH",
    BUCKET = "BUCKET",
    ERASER = "ERASER"
}

let items = [
  {
    label: "AnimJS",
    items: [
      {
        label: "Settings",
        action: () => { alert("Settings") }
      },
      {
        label: "Change Theme",
        action: () => { alert("hi") }
      },
      {
        label: "About",
        action: () => { alert("About") }
      }
    ]
  },
  {
    label: "File",
    items: [
      {
        label: "Open",
        action: () => { alert("Open") }
      },
      {
        label: "Save",
        action: () => { alert("Save") }
      },
      {
        label: "New",
        action: () => { alert("New") }
      },
      {
        label: "Export",
        action: () => { alert("Export") }
      }
    ]
  }
];

function Loading() {
    return <div className="dialog dialog--app-banner dialog--show" id="dialog--app-banner">
        <h1>Anim.JS</h1>
        <p>Version 1.0</p>

        <div className="progress-bar progress-bar--primary">
            <div className="progress-bar__bar" id="progress-bar"></div>
        </div>
        <span id="progress-bar-info"></span>
    </div>;
}

export default function Home() {
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(0);
    const [mode, setMode] = useState(E_Mode.BRUSH);
    const [exporting, setExporting] = useState(0);

    class Frame {
    index: number;
    items: DrawObject[];

    constructor(index: number) {
        console.log("New frame created with index #" + index);

        this.index = index;
        this.items = [];
    }

    static fromJSON(json: any) {
        let frame = new Frame(json.index);

        console.log(json);

        for (let _obj of json.items) {
        let obj:any = DrawObject.fromJSON(_obj);

        frame.items.push(obj);
        }

        return frame;
    }
}

   class Asset {
      type: any;
      base64: any;

      constructor(data: any) {
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

   class ImageAsset extends Asset {
        image: any;
      constructor(data: any) {
         super(data);

         this.image = new Image();
         this.image.src = this.base64;
      }

      static async fromImageURL(url:string) {
         return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url;
            image.crossOrigin = "anonymous";

            image.onload = () => {
               const canvas = document.createElement("canvas");
               const ctx: any = canvas.getContext("2d");

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

   class Layer {
    frames: any;

      constructor() {
         console.log("New layer created");

         this.frames = [];
         this.frames.push(new Frame(0));
      }

      static fromJSON(json: any) {
         let layer = new Layer();

         for (let _frame of json.frames) {

            let frame = Frame.fromJSON(_frame);
            layer.frames.push(frame);
         }

         return layer;
      }

      addFrame(frame: Frame) {
         this.frames.push(frame);
         this.frames.sort((a: any, b: any) => a.index - b.index);

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

   class Camera {
    x: any;
    y: any;
    scale: any;
    minScale: any;
    maxScale: any;
      constructor({ x, y, scale, minScale, maxScale }: any = {}) {
         this.x = x || 0.0;
         this.y = y || 0.0;
         this.scale = scale || 0.5;
         this.minScale = minScale || 0.25;
         this.maxScale = maxScale || 5;
      }

      static fromJSON(json: any) {
         return new Camera(json);
      }
   }

   class Vector {
    x: number;
    y: number;
      constructor(x = 0, y = 0) {
         this.x = x;
         this.y = y;
      }
   }

   class Rectangle extends Vector {
    w: number;
    h: number;
      constructor(x: number, y: number, w: number, h: number) {
         super(x, y);

         this.w = w;
         this.h = h;
      }
   }

   class DrawObject {
    type: string;
    pos: any;
    center: any;
    scale: any;
    rot: any;
    opacity: any;
    selected: any;
      constructor(data: any) {
        this.type = "generic";
        this.pos = data.pos || new Vector();
        this.center = data.center || new Vector();
        this.scale = data.scale || new Vector(1, 1);
        this.rot = data.rot || 0;
        this.opacity = data.opacity || 1;
        this.selected = false;
      }

      render(ctx: any) {} // abstract function

      _render(ctx: any) {
         ctx.save();

         ctx.translate(this.pos.x, this.pos.y);

         ctx.scale(this.scale.x, this.scale.y);
         ctx.rotate(this.rot);

         ctx.translate(-this.center.x, -this.center.y);

         ctx.globalAlpha = this.opacity;

         this.render(ctx);
         
         if (this.selected && mode === E_Mode.HAND && !exporting) this.renderSelected(ctx);

         ctx.restore();
      }

      renderSelected(ctx: any) {
         ctx.globalAlpha = 1;
         ctx.strokeStyle = "red";
      }

      static fromJSON(json: any) {
         switch (json.type) {
            case "stroke":
               return new Stroke(json);
               break;
            case "image":
               return new DrawImage(json);
               break;
         }
      }
   }

   class Stroke extends DrawObject {
    brush: any;
    points: any;

      constructor(data: any) {
         super(data);

         this.type = "stroke";
         this.brush = data.brush;
         this.points = data.points || [];
      }

      render(ctx: any) {
         ctx.lineWidth = this.points[0].pressure * this.brush.size;
         ctx.lineCap = "round";

         if (this.points.length === 1) {
            ctx.strokeStyle = `rgb(0,0,0)`;
            ctx.lineWidth = this.points[0].pressure * this.brush.size;
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            ctx.lineTo(this.points[0].x, this.points[0].y);
            ctx.stroke();
         }

         for (let i = 0; i < this.points.length - 1; i++) {
            ctx.strokeStyle = `rgba(0,0,0,${this.points[i].pressure})`;
            ctx.lineWidth = this.points[i].pressure * this.brush.size;
            ctx.beginPath();
            ctx.moveTo(this.points[i].x, this.points[i].y);
            ctx.lineTo(this.points[i + 1].x, this.points[i + 1].y);
            ctx.stroke();
         }
      }
   }

   class DrawImage extends DrawObject {
    imageAsset: ImageAsset;
    width: number;
    height: number;

      constructor(data: any) {
         super(data);

         if (!data.image || !data.image.src) {
            data.image = new Image();
            data.image.src = "/assets/images/no_img_placeholder.svg";
         }

         this.type = "image";
         this.imageAsset = data.imageAsset;
         this.width = data.width || this.imageAsset.image.width;
         this.height = data.height || this.imageAsset.image.height;
         this.center.x = this.width / 2;
         this.center.y = this.height / 2;
      }

      renderSelected(ctx: any) {
         super.renderSelected(ctx);

         ctx.strokeRect(0, 0, this.width, this.height);
      }

      render(ctx: any) {
         ctx.drawImage(this.imageAsset.image, 0, 0, this.width, this.height);
      }
   }

   const engineRef = useRef({
      camera: new Camera(), // Assuming your Camera class
      isPlaying: false,
      currentFrameIndex: 0,
      mouse: new Vector(),
      layers: [new Layer()],
      activeDrawObject: null,
      isPointerDown: false,
   });
   

   const handleResize = (e: any) => {
      dpr = window.devicePixelRatio || 1;
      ctx = canvas.getContext("2d");
      ctx2 = canvas2.getContext("2d");
      ctx3 = canvas3.getContext("2d");

      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;

      canvas2.width = canvas.width;
      canvas2.height = canvas.height;

      canvas3.width = metadata.width;
      canvas3.height = metadata.height;

      ctx.scale(dpr, dpr);
   };

   useEffect(() => {
      window.addEventListener("resize", handleResize);
      return () => {
         window.removeEventListener("resize", handleResize);
      };
   }, []);

   useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId: any;
    
    // --- IMPERATIVE LOOP ---
    const handleLoop = () => {
      const engine = engineRef.current;

      // Clear screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(engine.camera.scale, engine.camera.scale);
      ctx.translate(engine.camera.x, engine.camera.y);

      // Call your imperative rendering logic here
      // renderViewport(ctx, engine); 
      
      // Draw mouse pointer
      ctx.beginPath();
      ctx.arc(engine.mouse.x, engine.mouse.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
      ctx.fill();

      ctx.restore();

      // Loop
      animationFrameId = window.requestAnimationFrame(handleLoop);
    };

    // Start the loop
    handleLoop();

    // Cleanup when component unmounts
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const rect = canvas.getBoundingClientRect();

    console.log(rect);
    
    // Update the mutable ref directly (NO re-render triggered)
    engine.mouse.x = (e.clientX - rect.x) / engine.camera.scale - engine.camera.x;
    engine.mouse.y = (e.clientY - rect.y) / engine.camera.scale - engine.camera.y;

    if (engine.isPointerDown && mode === 'BRUSH') {
        // Handle your imperative brush logic here
    }
  };

    return (
        
        <main id="app">
            <MenuBar items={items} />

            { loading && <Loading /> }

            <div className="sidebar sidebar--left">
                <fieldset style={{
                    border: 'solid 4px #545454',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <legend>Mode</legend>

                    <div>
                        <input name="mode" value="HAND" type="radio" id="hand-mode" />
                        <label htmlFor="hand-mode" className="btn btn--primary">
                            <IconHandStop size={14} />Hand
                        </label>
                    </div>
                    <div>
                        <input name="mode" value="BRUSH" type="radio" id="brush-mode" defaultChecked />
                        <label htmlFor="brush-mode" className="btn btn--primary"><IconBrush size={14} />
                            Brush</label>
                    </div>
                    <div>
                        <input name="mode" value="ERASER" type="radio" id="eraser-mode" />
                        <label htmlFor="eraser-mode" className="btn btn--primary"><IconEraser size={14} />
                            Eraser</label>
                    </div>
                    <div>
                        <input name="mode" value="BUCKET" type="radio" id="bucket-mode" />
                        <label htmlFor="bucket-mode" className="btn btn--primary"><IconBucket size={14} />
                            Bucket</label>
                    </div>
                </fieldset>
            </div>

            <div className="viewport" id="viewport">
                <canvas ref={canvasRef}
          width={1920}
          height={1080}
          style={{ width: '100%', height: '100%', display: 'block' }}

          onPointerMove={handlePointerMove}
          onPointerDown={() => { engineRef.current.isPointerDown = true; }}
          onPointerUp={() => { engineRef.current.isPointerDown = false; }}></canvas>
            </div>

            <div className="sidebar sidebar--right">
                Brushes
            </div>

            <div className="playbar">
                <button className="btn btn--primary btn--sm"><IconPlayerSkipBack size={14} /></button>
                <button className="btn btn--primary btn--sm"><IconPlayerPlay size={14} /></button>
                <button className="btn btn--primary btn--sm"><IconPlayerSkipForward size={14} /></button>
            </div>

            <div className="sidebar sidebar--footer">
                Timeline
            </div>
        </main>
    );
}
