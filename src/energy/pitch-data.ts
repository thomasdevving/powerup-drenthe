import {DEFAULT_SETTINGS} from './profiles';
import {compareScenarios} from './model';

// Identieke winterdag en instellingen als de standaardstand van het dashboard.
export const PITCH_DAYS = compareScenarios(DEFAULT_SETTINGS);
export const PITCH_DAY = PITCH_DAYS[2];
export const pitchStep = (p: number) => PITCH_DAY.steps[Math.min(95, Math.max(0, Math.floor((6 + p * 17.75) * 4)))];
