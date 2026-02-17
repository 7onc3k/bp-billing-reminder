/**
 * Auto-continue plugin for OpenCode.
 *
 * When the agent finishes (session.idle), checks if there are still open
 * issues in the repo. If yes, re-injects a prompt so the agent continues.
 * Tracks restart count and timing as experiment metrics.
 */
import type { Plugin } from "@opencode-ai/plugin";

let restartCount = 0;
const startTime = Date.now();

export const AutoContinuePlugin: Plugin = async (ctx) => {
  return {
    event: async ({ event, client }) => {
      if (event.type !== "session.idle") return;

      const { stdout } = await ctx.$`gh issue list --state open --label spec --json number --jq length`;
      const specIssues = parseInt(stdout.trim(), 10);

      // Exclude the spec issue #1 itself — only count implementation issues
      const { stdout: openStdout } =
        await ctx.$`gh issue list --state open --json number --jq '[.[] | select(.number != 1)] | length'`;
      const openIssues = parseInt(openStdout.trim(), 10);

      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (openIssues > 0) {
        restartCount++;

        // Append metrics row: restart_number, elapsed_seconds, open_issues
        await ctx.$`echo "${restartCount},${elapsed},${openIssues}" >> .opencode/metrics.csv`;

        await client.session.prompt({
          sessionId: event.sessionId,
          messages: [
            {
              role: "user",
              content: `[auto-continue #${restartCount}] Zbývá ${openIssues} otevřených issues. Pokračuj v implementaci podle AGENTS.md.`,
            },
          ],
        });
      } else {
        // All done — write final metrics
        await ctx.$`echo "DONE,${restartCount},${elapsed},0" >> .opencode/metrics.csv`;
      }
    },
  };
};

export default AutoContinuePlugin;
