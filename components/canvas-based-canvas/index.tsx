import React, { useEffect, useState, useRef, Ref } from "react";
import _uniqueId from 'lodash/uniqueId';

import classes from './style.module.scss';
import AnimationCanvas from "../dots/canvas-based-animation";
import { Quad, AnimationState, AnimationStateEnum, QuadLoopingEngine } from "@/lib/canvas-algorithms";
import { QuadAnimationEngineV1 } from "@/lib/canvas-algos-animation";

interface Size {
    width: number;
    height: number;
}

export default function Canvas({ file, transformTime = 500, minDotSize = 4 }) {
    const [canvasId] = useState('canvasId');        /// TODO change to unique ID
    const [showcaseId] = useState('showcaseId');    /// TODO change to unique ID

    const [size, setSize] = useState<Size>({ width: 800, height: 600 });
    const getSize = () => {
        return {
            width: size.width + 42,
            height: size.height + 42,
        }
    }

    const [engine, setEngine] = useState<QuadLoopingEngine>();
    useEffect(() => {
        const canvas = document.getElementById(`dot-container-${canvasId}`) as HTMLCanvasElement;
        const imageCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
        setEngine(new QuadLoopingEngine(canvas, new QuadAnimationEngineV1(canvas, imageCanvas)));

        return () => {
            if (engine) {
                engine.terminate();
            }
        }
    }, []);

    const loadDots = (ctx: CanvasRenderingContext2D, width: any, height: any) => {
        engine.canvas.width = width;
        engine.canvas.height = height;

        const quads = [
            new Quad(ctx, 0, 0, width / 2, height / 2),
            new Quad(ctx, width / 2, 0, width / 2, height / 2),
            new Quad(ctx, 0, height / 2, width / 2, height / 2),
            new Quad(ctx, width / 2, height / 2, width / 2, height / 2),
        ];

        const statefuleQuads = quads.map(q => new AnimationState<Quad>(q));

        statefuleQuads.forEach(q => q.state = AnimationStateEnum.STAYING);

        engine.setQuads(statefuleQuads);
        engine.start();
    }

    const onMouseMove = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        const currentTargetRect = (event.target as HTMLElement).getBoundingClientRect();
        const x = event.pageX - currentTargetRect.left, y = event.pageY - currentTargetRect.top;

        // console.log(engine.quads)

        const newQuads = [];
        engine.quads
            .filter(q => q.state === AnimationStateEnum.STAYING && q.t.isInside(x, y))
            .forEach(p => {
                const splited = p.t.split();
                if (splited.length === 0) {
                    return;
                }
                if (p.t.w < minDotSize || p.t.h < minDotSize) {
                    p.state = AnimationStateEnum.SHOWINGIMAGE;
                    return;
                }
                p.state = AnimationStateEnum.DISAPPEARED;
                p.startTimestamp = Date.now();
                p.endTimestamp = Date.now() + transformTime;
                splited.forEach(s => {
                    const ss = new AnimationState<Quad>(s);
                    ss.state = AnimationStateEnum.APPEARING;
                    ss.parent = p;
                    ss.startTimestamp = Date.now();
                    ss.endTimestamp = Date.now() + transformTime;
                    newQuads.push(ss);
                });
            });
        engine.quads.push(...newQuads);
    }

    const loadFileIntoCanvas = (file: Blob, canvas: HTMLCanvasElement) => {

        const getSizeFitHeight = ({ width, height }) => {
            const availableHeight = window.screen.height - 200;

            if (availableHeight >= height) {
                return { width, height };
            } else {
                const radio = availableHeight / height;

                return {
                    width: width * radio,
                    height: height * radio
                };
            }
        }

        const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const { width, height } = getSizeFitHeight({ width: img.width, height: img.height });
                setSize({ width, height });
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height);
                loadDots(ctx, width, height);
            }
            img.src = event.target.result as string;
        }
        reader.readAsDataURL(file);
    }

    useEffect(() => {
        if (file) {
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
            loadFileIntoCanvas(file, canvas);
        }
    }, [file]);

    return <div id={showcaseId} className={classes.showcase} style={getSize()}>
        <canvas id={`dot-container-${canvasId}`} className={classes.dotContainer} onMouseMove={onMouseMove}></canvas>
        <canvas id={canvasId} className={classes.imageCanvas}></canvas>
    </div>
}