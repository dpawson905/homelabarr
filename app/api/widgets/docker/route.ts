import { NextRequest, NextResponse } from "next/server"
import Dockerode from "dockerode"
import type { ContainerData } from "./types"

const STATS_TIMEOUT_MS = 5_000

function calculateCpuPercent(stats: Dockerode.ContainerStats): number {
  if (!stats?.cpu_stats?.cpu_usage?.total_usage) return 0

  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    (stats.precpu_stats?.cpu_usage?.total_usage ?? 0)
  const systemDelta =
    stats.cpu_stats.system_cpu_usage - (stats.precpu_stats?.system_cpu_usage ?? 0)
  const cpuCount =
    stats.cpu_stats.online_cpus ?? stats.cpu_stats.cpu_usage?.percpu_usage?.length ?? 1

  if (systemDelta <= 0 || cpuDelta < 0) return 0
  return (cpuDelta / systemDelta) * cpuCount * 100
}

async function getContainerStats(
  container: Dockerode.Container
): Promise<Dockerode.ContainerStats | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), STATS_TIMEOUT_MS))
  return Promise.race([container.stats({ stream: false }), timeout])
}

async function buildContainerData(
  docker: Dockerode,
  containerInfo: Dockerode.ContainerInfo
): Promise<ContainerData> {
  const ports = (containerInfo.Ports ?? []).map((p) => ({
    privatePort: p.PrivatePort,
    publicPort: p.PublicPort ?? null,
    type: p.Type,
  }))

  const base: ContainerData = {
    id: containerInfo.Id,
    name: (containerInfo.Names[0] ?? "").replace(/^\//, ""),
    image: containerInfo.Image,
    state: containerInfo.State,
    status: containerInfo.Status,
    created: containerInfo.Created,
    ports,
    stats: null,
  }

  if (containerInfo.State !== "running") return base

  try {
    const stats = await getContainerStats(docker.getContainer(containerInfo.Id))
    if (!stats) return base

    const memoryUsage = stats.memory_stats?.usage ?? 0
    const memoryLimit = stats.memory_stats?.limit ?? 0

    return {
      ...base,
      stats: {
        cpuPercent: calculateCpuPercent(stats),
        memoryUsage,
        memoryLimit,
        memoryPercent: memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0,
      },
    }
  } catch {
    return base
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const socketPath = url.searchParams.get("socketPath") ?? "/var/run/docker.sock"
  const showAll = url.searchParams.get("all") === "true"

  const docker = new Dockerode({ socketPath })

  try {
    await docker.ping()
  } catch {
    return NextResponse.json(
      { error: "docker_unavailable", message: "Cannot connect to Docker daemon" },
      { status: 503 }
    )
  }

  try {
    const containerInfos = await docker.listContainers({ all: showAll })
    const containers = await Promise.all(
      containerInfos.map((info) => buildContainerData(docker, info))
    )
    return NextResponse.json({ containers }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch containers"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
