import { TEXT_SCALE_VALUES } from "@/lib/settings-store";

/**
 * The three display-accessibility preferences have to be on the document before the first paint.
 * `ThemeApplicator` writes them after mount, so a visitor who chose Large text or High Contrast
 * loaded every page at the default size and jumped afterwards, which is the flash this removes.
 *
 * It reads the same key `readSettings` reads and accepts the same values, so the two agree. The
 * applicator stays the authority: it runs after this and keeps the document in step with later
 * changes. Nothing here is rendered into the HTML, so there is no hydration mismatch.
 */
export function SettingsNoFlash() {
  return (
    <script
      id="styld-settings-no-flash"
      dangerouslySetInnerHTML={{
        __html: `try{var r=localStorage.getItem("styld_settings")||localStorage.getItem("ms_app_settings.v1");if(r){var s=JSON.parse(r),h=document.documentElement,t=${JSON.stringify(
          TEXT_SCALE_VALUES
        )}[s.textSize];if(t)h.style.setProperty("--text-scale",t);if(s.reduceMotion===true)h.setAttribute("data-reduce-motion","true");if(s.highContrast===true)h.setAttribute("data-high-contrast","true")}}catch(e){}`,
      }}
    />
  );
}
