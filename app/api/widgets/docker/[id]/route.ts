import { NextRequest, NextResponse } from "next/server"
import Dockerode from "dockerode"

type RouteContext = { params: Promise<{ id: string }> }

const VALID_ACTIONS = ["start", "stop", "restart"] as const
type ContainerAction = (typeof VALID_ACTIONS)[number]

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { id } = await params
  const body = await request.json()

  const action = body.action as string | undefined
  if (!action || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      {
        error: "Invalid action",
        message: `Action must be one of: ${VALID_ACTIONS.join(", ")}`,
      },
      { status: 400 }
    )
  }

  const socketPath = process.env.DOCKER_SOCKET_PATH ?? "/var/run/docker.sock"
  const docker = new Dockerode({ socketPath })

  try {
    await docker.ping()
  } catch {
    return NextResponse.json(
      { error: "docker_unavailable", message: "Cannot connect to Docker daemon" },
      { status: 503 }
    )
  }

  const container = docker.getContainer(id)

  try {
    await container.inspect()
  } catch {
    return NextResponse.json({ error: "Container not found", containerId: id }, { status: 404 })
  }

  try {
    if (action === "start") await container.start()
    else if (action === "stop") await container.stop()
    else await container.restart()
    return NextResponse.json({ success: true, action, containerId: id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed"
    return NextResponse.json(
      { error: "Action failed", message, action, containerId: id },
      { status: 409 }
    )
  }
}
