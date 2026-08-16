#!/usr/bin/env node
import {runCaseLongformBridge} from './lib/runtime-case-longform.mjs';

if (!runCaseLongformBridge()) await import('./lib/video-runtime.mjs');
