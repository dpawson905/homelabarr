export interface GiteaResponse {
  repositories: number
  notifications: number
  issues: number
  pullRequests: number
  serviceType: "gitea" | "forgejo"
}
