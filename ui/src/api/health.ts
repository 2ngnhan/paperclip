import { api } from "./client";

export type HealthStatus = {
  status: "ok";
  deploymentMode?: "local_trusted" | "authenticated";
  deploymentExposure?: "private" | "public";
  authReady?: boolean;
  bootstrapStatus?: "ready" | "bootstrap_pending";
  bootstrapInviteActive?: boolean;
  features?: {
    companyDeletionEnabled?: boolean;
  };
};

export const healthApi = {
  get: async (): Promise<HealthStatus> => {
    return api.get<HealthStatus>("/health");
  },
};
