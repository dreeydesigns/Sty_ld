import { Suspense } from "react";
import { AppointmentPlanning, PlanningFirstPaint } from "@/components/appointment-planning";

export default function BookPage() {
  return (
    <Suspense fallback={<PlanningFirstPaint />}>
      <AppointmentPlanning />
    </Suspense>
  );
}
