export interface EntityState {
  entityId: string
  friendlyName: string
  state: string
  domain: string
  lastChanged: string
  attributes: Record<string, unknown>
  controllable: boolean
}

export interface HomeAssistantResponse {
  entities: EntityState[]
}

export interface ServiceCallRequest {
  entityId: string
  domain: string
  service: string
}
