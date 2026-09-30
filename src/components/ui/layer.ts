'use client';
import {createContext,useContext} from 'react';

/**
 * Which stacking layer a floating surface belongs to. Dialog content provides "dialog" so popovers and
 * selects opened from inside a dialog render above it (--craft-z-dialog-popover) instead of behind it.
 */
export type FloatingLayer='page'|'dialog';
export const FloatingLayerContext=createContext<FloatingLayer>('page');
export const useFloatingLayer=()=>useContext(FloatingLayerContext);
