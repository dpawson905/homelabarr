import { NextResponse } from "next/server"
import * as si from "systeminformation"

export async function GET(): Promise<NextResponse> {
  try {
    const [currentLoad, mem, fsSize, networkStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
    ])

    // CPU metrics
    const cpu = {
      usage: currentLoad.currentLoad,
      cores: currentLoad.cpus.map((c) => c.load),
    }

    // Memory metrics
    const memory = {
      used: mem.used,
      total: mem.total,
      usage: (mem.used / mem.total) * 100,
    }

    // Disk metrics — filter to real filesystems and deduplicate by device
    const realFsTypes = new Set(["ext2", "ext3", "ext4", "xfs", "btrfs", "zfs", "ntfs", "vfat", "fat32", "apfs", "hfs+"])
    const validFs = fsSize.filter((fs) => fs.size > 0 && realFsTypes.has(fs.type.toLowerCase()))
    // Deduplicate by device to avoid counting the same physical disk multiple times
    const seen = new Set<string>()
    const uniqueFs = validFs.filter((fs) => {
      if (seen.has(fs.fs)) return false
      seen.add(fs.fs)
      return true
    })
    const { diskUsed, diskSize } = uniqueFs.reduce(
      (acc, fs) => ({ diskUsed: acc.diskUsed + fs.used, diskSize: acc.diskSize + fs.size }),
      { diskUsed: 0, diskSize: 0 }
    )
    const disk = {
      used: diskUsed,
      total: diskSize,
      usage: diskSize > 0 ? (diskUsed / diskSize) * 100 : 0,
      filesystems: uniqueFs.map((fs) => ({
        mount: fs.mount,
        type: fs.type,
        used: fs.used,
        size: fs.size,
        usage: fs.use,
      })),
    }

    // Network metrics — sum rx/tx, exclude loopback interfaces
    const nonLoopback = networkStats.filter((iface) => !iface.iface.startsWith("lo"))
    const network = {
      rx_sec: nonLoopback.reduce((sum, iface) => sum + iface.rx_sec, 0),
      tx_sec: nonLoopback.reduce((sum, iface) => sum + iface.tx_sec, 0),
    }

    return NextResponse.json(
      { cpu, memory, disk, network },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Failed to fetch system stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch system statistics" },
      { status: 500 }
    )
  }
}
