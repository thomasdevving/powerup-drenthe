import {Config} from '@remotion/cli/config';

// Headless WebGL: "angle" gebruikt de GPU. Faalt dat, zet dan GL=swangle (softwarematig, trager).
const gl = (process.env.GL as 'angle' | 'swangle' | undefined) ?? 'angle';
Config.setChromiumOpenGlRenderer(gl);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setConcurrency(Number(process.env.CONCURRENCY ?? 6));
Config.setOverwriteOutput(true);
