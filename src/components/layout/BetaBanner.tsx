import { useTranslation } from "react-i18next";

import { config } from "@/lib/config";

/** Persistent early-beta notice under the app bar. Flip `config.betaBanner` to
 *  false at GA to remove it. */
export function BetaBanner() {
  const { t } = useTranslation();

  if (!config.betaBanner) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-b border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-700 dark:text-amber-300">
      <span>{t("banner.beta")}</span>
      <a
        href={config.feedbackUrl}
        className="font-medium underline underline-offset-2 hover:no-underline"
      >
        {t("banner.feedback")}
      </a>
    </div>
  );
}
