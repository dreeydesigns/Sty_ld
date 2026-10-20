"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_WORLD_INTENSITY,
  activeWorld,
  activeWorldIntensity,
  type WorldDefinition,
  type WorldIntensity,
} from "@/lib/beauty-world";
import { APP_SESSION_EVENT, readAppSession } from "@/lib/client-session";
import { readSettings, SETTINGS_CHANGE_EVENT } from "@/lib/settings-store";

const AMBIENT_COUNT: Record<WorldIntensity, number> = {
  calm: 4,
  balanced: 7,
  immersive: 11,
};

interface AtmosphereState {
  world: WorldDefinition | null;
  intensity: WorldIntensity;
  reducedMotion: boolean;
  dataSaver: boolean;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function prefersReducedData() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-data: reduce)").matches;
}

function connectionSaveData() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean };
    }
  ).connection;

  return Boolean(connection?.saveData);
}

function readAtmosphereState(): AtmosphereState {
  const session = readAppSession();
  const settings = readSettings();

  return {
    world: activeWorld(session),
    intensity: activeWorldIntensity(session) ?? DEFAULT_WORLD_INTENSITY,
    reducedMotion: settings.reduceMotion || prefersReducedMotion(),
    dataSaver: prefersReducedData() || connectionSaveData(),
  };
}

export function WorldAtmosphere() {
  const [state, setState] = useState<AtmosphereState | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dataQuery = window.matchMedia("(prefers-reduced-data: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: {
          saveData?: boolean;
          addEventListener?: (type: string, listener: () => void) => void;
          removeEventListener?: (type: string, listener: () => void) => void;
        };
      }
    ).connection;

    function sync() {
      setState(readAtmosphereState());
    }

    sync();
    window.addEventListener(APP_SESSION_EVENT, sync);
    window.addEventListener(SETTINGS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    motionQuery.addEventListener("change", sync);
    dataQuery.addEventListener("change", sync);
    connection?.addEventListener?.("change", sync);

    return () => {
      window.removeEventListener(APP_SESSION_EVENT, sync);
      window.removeEventListener(SETTINGS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
      motionQuery.removeEventListener("change", sync);
      dataQuery.removeEventListener("change", sync);
      connection?.removeEventListener?.("change", sync);
    };
  }, []);

  if (
    !state?.world ||
    state.world.key === "default" ||
    state.world.ambient === "none" ||
    state.reducedMotion ||
    state.dataSaver
  ) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="world-atmosphere"
      data-ambient={state.world.ambient}
      data-world-atmosphere={state.world.key}
    >
      {Array.from({ length: AMBIENT_COUNT[state.intensity] }, (_, index) => (
        <span className="world-atmosphere__particle" key={index} />
      ))}
    </div>
  );
}
