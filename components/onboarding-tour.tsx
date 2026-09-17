"use client";

import { useEffect, useState } from "react";
import { Joyride, STATUS, ACTIONS, EVENTS, Step } from "react-joyride";

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      const isTourCompleted = localStorage.getItem("ms_tour_completed");
      if (!isTourCompleted) {
        const savedStep = sessionStorage.getItem("ms_tour_step");
        if (savedStep) {
          setStepIndex(parseInt(savedStep, 10));
        }
        setRun(true);
      }
    }, 0);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleJoyrideCallback = (data: any) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem("ms_tour_completed", "true");
      sessionStorage.removeItem("ms_tour_step");
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Keep step index in sync and persist across page loads
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextStepIndex);
      sessionStorage.setItem("ms_tour_step", nextStepIndex.toString());
    }
  };

  const steps: Step[] = [
    {
      target: "body",
      content: "Welcome to Styld! Let's walk through our 5-step booking process.",
      placement: "center",
      skipBeacon: true,
    },
    {
      target: ".tour-explore",
      content: "Step 1: Discover top beauty professionals and curated packages.",
      placement: "bottom",
    },
    {
      target: ".tour-book",
      content: "Step 2: Ready to book? Start a custom booking request instantly.",
      placement: "bottom",
    },
    {
      target: ".tour-home",
      content: "Step 3: Track your upcoming appointments and booking history.",
      placement: "top",
    },
    {
      target: ".tour-profile",
      content: "Step 4: Manage your profile, wallet, and settings. You're all set!",
      placement: "top",
    },
  ];

  if (!mounted || !run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      onEvent={handleJoyrideCallback}
      continuous={true}
      options={{
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
        primaryColor: "var(--color-accent)",
        textColor: "var(--text-primary)",
        zIndex: 10000,
      }}
      styles={{
        buttonPrimary: {
          backgroundColor: "var(--color-accent)",
          borderRadius: "9999px",
          padding: "8px 16px",
          fontWeight: "bold",
        },
        buttonBack: {
          color: "var(--text-secondary)",
          marginRight: "10px",
          fontWeight: "bold",
        },
        buttonSkip: {
          color: "var(--text-secondary)",
          fontWeight: "bold",
        }
      }}
    />
  );
}

