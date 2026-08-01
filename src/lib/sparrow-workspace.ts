export const SPARROW_WORKSPACE_KEY = "sparrow_ai_workspace_artifact_v1";
export const SPARROW_WORKSPACE_EVENT = "sparrow-ai-workspace-updated";

export type SparrowWorkspaceChartType = "bar" | "line" | "pie" | "area";

export type SparrowWorkspaceArtifact = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  source: string;
  chartType: SparrowWorkspaceChartType;
  rows: Record<string, unknown>[];
};

export function saveSparrowWorkspaceArtifact(artifact: SparrowWorkspaceArtifact) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPARROW_WORKSPACE_KEY, JSON.stringify(artifact));
  window.dispatchEvent(new CustomEvent(SPARROW_WORKSPACE_EVENT, { detail: artifact }));
}

export function readSparrowWorkspaceArtifact(): SparrowWorkspaceArtifact | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SPARROW_WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SparrowWorkspaceArtifact;
    return parsed?.rows && Array.isArray(parsed.rows) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSparrowWorkspaceArtifact() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SPARROW_WORKSPACE_KEY);
  window.dispatchEvent(new CustomEvent(SPARROW_WORKSPACE_EVENT));
}
