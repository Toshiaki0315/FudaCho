import { createDefaultLanes, type Lane } from "./lane";

export interface Settings {
  projectName: string;
  lanes: Lane[];
}

export function createDefaultSettings(projectName = "札帖"): Settings {
  return {
    projectName,
    lanes: createDefaultLanes(),
  };
}
